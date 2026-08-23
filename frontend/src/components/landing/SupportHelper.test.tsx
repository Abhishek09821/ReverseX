import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';

import { SupportHelper } from './SupportHelper';
import { openSupportHelper } from './support-events';

vi.mock('@/lib/api/client', () => ({
  api: { contact: vi.fn() },
}));

const SCAN_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

describe('SupportHelper', () => {
  beforeEach(() => {
    vi.mocked(api.contact).mockReset();
  });

  it('submits page context and shows the accepted state', async () => {
    vi.mocked(api.contact).mockResolvedValue({ status: 'accepted' });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[`/scan/${SCAN_ID}/technology`]}>
        <SupportHelper />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Contact ReverseX support' }));
    await user.type(screen.getByLabelText('Name (optional)'), 'A Visitor');
    await user.type(screen.getByLabelText('Email (optional)'), 'visitor@example.com');
    await user.type(screen.getByLabelText('Message'), 'I need help reading this report.');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Message accepted.')).toBeInTheDocument();
    expect(api.contact).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'A Visitor',
        email: 'visitor@example.com',
        message: 'I need help reading this report.',
        website: '',
        scan_id: SCAN_ID,
        current_page: expect.stringMatching(new RegExp(`/scan/${SCAN_ID}/technology$`)),
      }),
    );
  });

  it('omits invalid route segments from support context', async () => {
    vi.mocked(api.contact).mockResolvedValue({ status: 'accepted' });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/scan/not-a-valid-ulid']}>
        <SupportHelper />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Contact ReverseX support' }));
    await user.type(screen.getByLabelText('Message'), 'The saved scan is unavailable.');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Message accepted.')).toBeInTheDocument();
    expect(api.contact).toHaveBeenCalledWith(
      expect.not.objectContaining({ scan_id: expect.anything() }),
    );
  });

  it('opens the existing dialog from an external support control', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <button type="button" onClick={(event) => openSupportHelper(event.currentTarget)}>
          Need help?
        </button>
        <SupportHelper />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Need help?' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact ReverseX support' })).toBeInTheDocument();
  });
});
