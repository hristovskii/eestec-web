import {
  AuthShell,
  ExpiredFlow,
  ForgotFlow,
  LoginForm,
  PendingCard,
  RegisterFlow,
  ResetForm,
} from '@/features/auth/public';

import { DsSection } from './ds-section';

export function AuthStatesSection() {
  return (
    <DsSection
      id="auth-states"
      title="Member accounts"
      intro="The real screens (member accounts, Phase 2): log in, sign-up, waiting for approval, forgot / reset password, expired link. Sign-up sent from here creates a sample account (its confirmation link is in the dev toolbar's mock e-mails). Log in: try a wrong password for the error notice, or the sample member (marija.s@students.feit.ukim.edu.mk, sample password in docs/sample-data.md). Forgot password and the expired link end in “Check your inbox”; the link itself appears in the dev toolbar's mock e-mails. The reset form here has a made-up link, so sending it answers “expired”."
      frames="01-AuthForm, 07-AuthPage, 07-AuthPage-Register, 07-AuthStates"
    >
      <div className="flex flex-col gap-10">
        <AuthShell headingLevel="h2">
          <LoginForm pending={false} next="/" />
        </AuthShell>
        <AuthShell headingLevel="h2">
          <LoginForm pending next="/" />
        </AuthShell>
        <AuthShell wide headingLevel="h2">
          <RegisterFlow
            faculties={['FINKI', 'FEEIT', 'Faculty of Mechanical Engineering']}
            siteName="EESTEC LC Skopje"
          />
        </AuthShell>
        <AuthShell headingLevel="h2">
          <PendingCard firstName="Elena" since="4 Oct 2026" />
        </AuthShell>
        <AuthShell headingLevel="h2">
          <ForgotFlow />
        </AuthShell>
        <AuthShell headingLevel="h2">
          <ResetForm token="lab-link" email="marija.s@students.feit.ukim.edu.mk" name="Marija Stojanovska" />
        </AuthShell>
        <AuthShell headingLevel="h2">
          <ExpiredFlow type="reset" />
        </AuthShell>
      </div>
    </DsSection>
  );
}
