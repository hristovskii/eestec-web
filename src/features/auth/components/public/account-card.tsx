'use client';

import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { type FieldErrors, fieldErrorsFrom } from '@/shared/forms/action-result';
import { useRouter } from '@/shared/i18n/navigation';
import type { RelativeAge } from '@/shared/lib/relative-age';
import { localizedPath } from '@/shared/seo/alternates';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';
import { Input } from '@/shared/ui/primitives/input';
import { FormField } from '@/shared/ui/form/form-field';
import { PasswordInput, PasswordRules } from '@/shared/ui/form/password-field';

import { changeMyPassword, requestMyEmailChange } from '../../actions/my-account';
import { checkPassword } from '../../domain/password';

// Zod and the schemas load when a dialog is first used, not with the page.
const loadSchema = () => import('../../schemas/account.schema');

type Result =
  | { ok: true; data?: unknown }
  | { ok: false; error: string; fieldErrors?: FieldErrors; retryAt?: string; message?: string };

const minutesLeft = (retryAt: string) => Math.max(1, Math.ceil((Date.parse(retryAt) - Date.now()) / 60_000));

export type DeleteAccountAction = (input: unknown) => Promise<
  | { ok: true; data: { firstName: string } }
  | {
      ok: false;
      error: string;
      fieldErrors?: FieldErrors;
      retryAt?: string;
    }
>;

/**
 * "Account" on /profile (MyProfile): e-mail, password, download my data and delete my account.
 * The member's own account: the deleting itself spans several features, so the page hands in that
 * action. After deleting, a full-screen card replaces the page (the session is gone).
 */
export function AccountCard({
  email,
  name,
  passwordAge,
  memoriesPublished,
  deleteAccount,
  notice,
}: {
  email: string;
  name: string;
  passwordAge: RelativeAge | null;
  memoriesPublished: number;
  deleteAccount: DeleteAccountAction;
  /** From the link of a new-address e-mail: it worked, or it did not. */
  notice: 'changed' | 'expired' | null;
}) {
  const t = useTranslations('auth.account');
  const locale = useLocale();
  const [dialog, setDialog] = React.useState<'email' | 'password' | 'delete' | null>(null);
  const [deletedFor, setDeletedFor] = React.useState<string | null>(null);

  const ago = passwordAge
    ? new Intl.RelativeTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', { numeric: 'auto' }).format(
        -passwordAge.count,
        passwordAge.unit,
      )
    : null;

  return (
    <div className="flex flex-col">
      {notice && (
        <Notice
          tone={notice === 'changed' ? 'info' : 'urgent'}
          role="status"
          icon={notice === 'changed' ? <CircleCheck className="size-[22px]" /> : undefined}
          className="mb-4"
        >
          {notice === 'changed' ? t('email.changedNotice') : t('email.expiredNotice')}
        </Notice>
      )}

      <Row
        title={t('email.label')}
        text={email}
        action={t('email.change')}
        onAction={() => setDialog('email')}
      />
      <Row
        title={t('password.label')}
        text={ago ? t('password.changedAgo', { ago }) : null}
        action={t('password.change')}
        onAction={() => setDialog('password')}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-[18px]">
        <div className="flex flex-col gap-1">
          <strong className="text-body">{t('download.title')}</strong>
          <span className="text-small text-muted-ink">{t('download.text')}</span>
        </div>
        <Button asChild variant="quiet" size="sm">
          {/* A file, not a page: the browser downloads it. */}
          <a href="/api/me/export" download>
            {t('download.button')}
          </a>
        </Button>
      </div>

      <div className="mt-2 rounded-md border-2 border-brand p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex flex-col gap-1.5">
            <strong className="text-body">{t('delete.title')}</strong>
            <span className="text-small text-muted-ink">{t('delete.text')}</span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog('delete')}>
            {t('delete.button')}
          </Button>
        </div>
      </div>

      <EmailDialog open={dialog === 'email'} onClose={() => setDialog(null)} />
      <PasswordDialog open={dialog === 'password'} onClose={() => setDialog(null)} person={{ email, name }} />
      <DeleteDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        memoriesPublished={memoriesPublished}
        deleteAccount={deleteAccount}
        onDeleted={(firstName) => {
          setDialog(null);
          setDeletedFor(firstName);
        }}
      />
      {deletedFor !== null && (
        <DeletedCard firstName={deletedFor} home={localizedPath('/', locale === 'mk' ? 'mk' : 'en')} />
      )}
    </div>
  );
}

function Row({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string | null;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-[18px] first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-col gap-1">
        <strong className="text-body">{title}</strong>
        {text && <span className="text-small break-all text-muted-ink">{text}</span>}
      </div>
      <Button type="button" variant="quiet" size="sm" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

/** What a failed action shows: field errors under the fields, or one line at the bottom. */
function useFormErrors() {
  const t = useTranslations('auth.account.errors');
  const tErrors = useTranslations('auth.errors');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failure, setFailure] = React.useState<string | null>(null);

  const text = (key: string | undefined) => {
    if (!key) return undefined;
    if (key === 'currentWrong' || key === 'emailTaken' || key === 'emailSame' || key === 'passwordSame')
      return t(key);
    if (
      key === 'required' ||
      key === 'email' ||
      key === 'tooLong' ||
      key === 'passwordShort' ||
      key === 'passwordPersonal' ||
      key === 'passwordCommon'
    )
      return tErrors(key);
    return t('failed');
  };
  const fromResult = (result: Result) => {
    if (result.ok) return;
    if (result.error === 'validation' && result.fieldErrors) {
      setErrors(result.fieldErrors);
      setFailure(null);
    } else if (result.error === 'rate_limited' && result.retryAt) {
      setErrors({});
      setFailure(t('locked', { minutes: minutesLeft(result.retryAt) }));
    } else {
      setErrors({});
      setFailure(t('failed'));
    }
  };
  const reset = () => {
    setErrors({});
    setFailure(null);
  };
  return { errors, setErrors, failure, setFailure, text, fromResult, reset };
}

function EmailDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('auth.account.email');
  const locale = useLocale();
  const form = useFormErrors();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  function close() {
    onClose();
    // The next time starts afresh.
    setTimeout(() => {
      setEmail('');
      setPassword('');
      setSentTo(null);
      form.reset();
    }, 200);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const { changeEmailSchema } = await loadSchema();
      const parsed = changeEmailSchema.safeParse({ email, password });
      if (!parsed.success) {
        form.setErrors(fieldErrorsFrom(parsed.error.issues));
        return;
      }
      const result = await requestMyEmailChange(parsed.data, locale === 'mk' ? 'mk' : 'en');
      if (result.ok) setSentTo(result.data.email);
      else form.fromResult(result);
    } catch {
      form.fromResult({ ok: false, error: 'unexpected' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !sending && close()}>
      <DialogContent>
        {sentTo ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('sentTitle')}</DialogTitle>
              <DialogDescription className="text-small" role="status">
                {t('sentText', { email: sentTo })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" size="sm" onClick={close}>
                {t('done')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription className="text-small">{t('text')}</DialogDescription>
            </DialogHeader>
            <FormField id="ae-email" label={t('newLabel')} error={form.text(form.errors.email?.[0])}>
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </FormField>
            <FormField id="ae-password" label={t('password')} error={form.text(form.errors.password?.[0])}>
              {(control) => (
                <PasswordInput
                  {...control}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </FormField>
            {form.failure && <Failure>{form.failure}</Failure>}
            <DialogFooter>
              <Button type="button" variant="quiet" size="sm" onClick={close}>
                {t('cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={sending}>
                {t('send')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  open,
  onClose,
  person,
}: {
  open: boolean;
  onClose: () => void;
  person: { email: string; name: string };
}) {
  const t = useTranslations('auth.account.password');
  const tRules = useTranslations('auth.rules');
  const tCancel = useTranslations('auth.account.delete');
  const router = useRouter();
  const form = useFormErrors();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const checks = checkPassword(next, person);
  const rules = [
    { id: 'length', label: tRules('length'), ok: checks.length },
    { id: 'personal', label: tRules('personal'), ok: checks.personal && next !== '' },
    { id: 'common', label: tRules('common'), ok: checks.common && next !== '' },
  ];

  function close() {
    onClose();
    setTimeout(() => {
      setCurrent('');
      setNext('');
      form.reset();
    }, 200);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const { changePasswordSchema } = await loadSchema();
      const parsed = changePasswordSchema(person).safeParse({ current, next });
      if (!parsed.success) {
        form.setErrors(fieldErrorsFrom(parsed.error.issues));
        return;
      }
      const result = await changeMyPassword(parsed.data);
      if (result.ok) {
        close();
        toast.success(t('saved'));
        router.refresh();
      } else form.fromResult(result);
    } catch {
      form.fromResult({ ok: false, error: 'unexpected' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !sending && close()}>
      <DialogContent>
        <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
          </DialogHeader>
          <FormField id="ap-current" label={t('current')} error={form.text(form.errors.current?.[0])}>
            {(control) => (
              <PasswordInput
                {...control}
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            )}
          </FormField>
          <div>
            <FormField id="ap-next" label={t('next')} error={form.text(form.errors.next?.[0])}>
              {(control) => (
                <PasswordInput
                  {...control}
                  autoComplete="new-password"
                  aria-describedby={[control['aria-describedby'], 'ap-rules'].filter(Boolean).join(' ')}
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                />
              )}
            </FormField>
            <PasswordRules id="ap-rules" rules={rules} />
          </div>
          {form.failure && <Failure>{form.failure}</Failure>}
          <DialogFooter>
            <Button type="button" variant="quiet" size="sm" onClick={close}>
              {tCancel('cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={sending}>
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  open,
  onClose,
  memoriesPublished,
  deleteAccount,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  memoriesPublished: number;
  deleteAccount: DeleteAccountAction;
  onDeleted: (firstName: string) => void;
}) {
  const t = useTranslations('auth.account.delete');
  const form = useFormErrors();
  const [password, setPassword] = React.useState('');
  const [alsoMemories, setAlsoMemories] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  function close() {
    onClose();
    setTimeout(() => {
      setPassword('');
      setAlsoMemories(false);
      form.reset();
    }, 200);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password === '') {
      form.setErrors({ password: ['required'] });
      return;
    }
    setSending(true);
    try {
      const result = await deleteAccount({ password, alsoDeleteMemories: alsoMemories });
      if (result.ok) onDeleted(result.data.firstName);
      else form.fromResult(result);
    } catch {
      form.fromResult({ ok: false, error: 'unexpected' });
    } finally {
      setSending(false);
    }
  }

  const items = ['profile', 'cv', 'applications', 'drafts', 'name'] as const;
  return (
    <Dialog open={open} onOpenChange={(value) => !value && !sending && close()}>
      <DialogContent role="alertdialog">
        <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription className="text-small">{t('lead')}</DialogDescription>
          </DialogHeader>
          <ul className="m-0 list-disc pl-5 text-small leading-[1.7]">
            {items.map((item) => (
              <li key={item}>{t(`items.${item}`)}</li>
            ))}
          </ul>
          {memoriesPublished > 0 && (
            <label className="grid cursor-pointer grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-md bg-surface p-4">
              <input
                type="checkbox"
                checked={alsoMemories}
                onChange={(event) => setAlsoMemories(event.target.checked)}
                className="mt-0.5 size-5 accent-brand"
              />
              <span className="flex flex-col gap-1">
                <strong className="text-small">{t('memories', { count: memoriesPublished })}</strong>
                <span className="text-small text-muted-ink">{t('memoriesHelp')}</span>
              </span>
            </label>
          )}
          <FormField id="ad-password" label={t('password')} error={form.text(form.errors.password?.[0])}>
            {(control) => (
              <PasswordInput
                {...control}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </FormField>
          {form.failure && <Failure>{form.failure}</Failure>}
          <DialogFooter>
            <Button type="button" variant="quiet" size="sm" onClick={close}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="danger" size="sm" disabled={sending}>
              {sending ? t('deleting') : t('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Failure({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-small font-medium text-brand-dark">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** After deleting (MyProfileStates › After deleting): the page is gone, this card is all there is. */
function DeletedCard({ firstName, home }: { firstName: string; home: string }) {
  const t = useTranslations('auth.account.delete');
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => heading.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-surface p-4">
      <div
        role="status"
        className="flex w-full max-w-[480px] flex-col items-center gap-4 rounded-lg border border-line bg-white px-6 py-12 text-center"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-surface">
          <CircleCheck className="size-8" aria-hidden />
        </span>
        <h2 ref={heading} tabIndex={-1} className="text-h3 font-bold outline-none">
          {t('doneTitle')}
        </h2>
        <p className="text-body text-muted-ink">{t('doneText', { name: firstName })}</p>
        {/* A full page load: the header must forget the member. */}
        <Button asChild>
          <a href={home}>{t('home')}</a>
        </Button>
      </div>
    </div>
  );
}
