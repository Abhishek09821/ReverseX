import { LifeBuoyIcon, SendIcon } from 'lucide-react';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api, type ContactPayload } from '@/lib/api/client';
import { describeError } from '@/lib/api/errors';
import { OPEN_SUPPORT_EVENT, type OpenSupportDetail } from './support-events';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export function SupportHelper() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const externalOpener = useRef<HTMLElement | null>(null);
  const formId = useId();
  const scanId = scanIdFromPath(location.pathname);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<OpenSupportDetail>;
      externalOpener.current = customEvent.detail?.opener ?? null;
      setOpen(true);
    };

    window.addEventListener(OPEN_SUPPORT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, handleOpen);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload: ContactPayload = {
      name: readOptional(form, 'name'),
      email: readOptional(form, 'email'),
      message: String(form.get('message') ?? '').trim(),
      website: String(form.get('website') ?? ''),
      current_page: `${window.location.origin}${location.pathname}${location.search}${location.hash}`,
      ...(scanId ? { scan_id: scanId } : {}),
    };

    if (!payload.message) {
      setState({ kind: 'error', message: 'Please enter a message.' });
      return;
    }

    setState({ kind: 'submitting' });
    try {
      await api.contact(payload);
      formElement.reset();
      setState({ kind: 'success' });
    } catch (error) {
      const described = describeError(error);
      setState({ kind: 'error', message: described.detail || described.title });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && state.kind !== 'submitting') setState({ kind: 'idle' });
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="lg"
          className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg shadow-foreground/15 sm:right-6 sm:bottom-6"
          aria-label="Contact ReverseX support"
        >
          <LifeBuoyIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Need help?</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[min(90dvh,42rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          const opener = externalOpener.current;
          if (!opener) return;
          event.preventDefault();
          externalOpener.current = null;
          window.requestAnimationFrame(() => {
            if (opener.isConnected) opener.focus();
          });
        }}
      >
        <DialogHeader>
          <DialogTitle>Contact ReverseX support</DialogTitle>
          <DialogDescription>
            Send a product question or report an issue. This is a support form, not a chatbot.
          </DialogDescription>
        </DialogHeader>

        {state.kind === 'success' ? (
          <div className="rounded-lg border border-status-verified/40 bg-status-verified/10 p-4" role="status">
            <p className="text-sm font-medium">Message accepted.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Thanks—your message was accepted for review.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <form className="space-y-4" aria-describedby={`${formId}-privacy`} onSubmit={(event) => void handleSubmit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${formId}-name`} label="Name (optional)">
                <Input id={`${formId}-name`} name="name" autoComplete="name" maxLength={100} disabled={state.kind === 'submitting'} />
              </Field>
              <Field id={`${formId}-email`} label="Email (optional)">
                <Input id={`${formId}-email`} name="email" type="email" autoComplete="email" maxLength={254} disabled={state.kind === 'submitting'} />
              </Field>
            </div>
            <div>
              <label htmlFor={`${formId}-message`} className="mb-1.5 block text-sm font-medium">Message</label>
              <textarea
                id={`${formId}-message`}
                name="message"
                required
                rows={5}
                maxLength={4000}
                disabled={state.kind === 'submitting'}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="How can we help?"
              />
            </div>
            <div className="support-honeypot" aria-hidden="true">
              <label htmlFor={`${formId}-website`}>Leave this field empty</label>
              <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <p id={`${formId}-privacy`} className="text-xs leading-5 text-muted-foreground">
              The current page{scanId ? ' and scan ID' : ''} will be included to help diagnose your message. Name and email are optional.
            </p>
            {state.kind === 'error' && <p role="alert" className="text-xs text-destructive">{state.message}</p>}
            <Button type="submit" className="w-full" disabled={state.kind === 'submitting'}>
              <SendIcon className="size-4" aria-hidden="true" />
              {state.kind === 'submitting' ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>{children}</div>;
}

function readOptional(form: FormData, key: string): string | undefined {
  const value = String(form.get(key) ?? '').trim();
  return value || undefined;
}

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

function scanIdFromPath(pathname: string): string | undefined {
  const match = /^\/scan\/([^/]+)/.exec(pathname);
  if (!match?.[1]) return undefined;
  try {
    const candidate = decodeURIComponent(match[1]).toUpperCase();
    return ULID_PATTERN.test(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}
