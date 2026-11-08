import { AuthShell, ExpiredFlow, ForgotFlow, LoginForm, ResetForm } from '@/features/auth/public';

import { DsSection } from './ds-section';

export function AuthStatesSection() {
  return (
    <DsSection
      id="auth-states"
      title="Member log in and password"
      intro="The real screens (member accounts, Phase 2). Log in: try a wrong password for the error notice, or the sample member (marija.s@students.feit.ukim.edu.mk, sample password in docs/sample-data.md). Forgot password and the expired link end in “Check your inbox”; the link itself appears in the dev toolbar's mock e-mails. The reset form here has a made-up link, so sending it answers “expired”."
      frames="01-AuthForm, 07-AuthPage, 07-AuthStates"
    >
      <div className="flex flex-col gap-10">
        <AuthShell headingLevel="h2">
          <LoginForm pending={false} next="/" />
        </AuthShell>
        <AuthShell headingLevel="h2">
          <LoginForm pending next="/" />
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
