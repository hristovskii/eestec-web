import { CompanyForm } from '@/features/partners';

import { DsSection } from './ds-section';

export function CompanyFormStatesSection() {
  return (
    <DsSection
      id="company-form-states"
      title="Partnership inquiry form"
      intro="The real CompanyForm: send it empty for the error summary, fill it in for “Sending…” and the confirmation. Sent from here it is stored like any inquiry (sample data, shown in Inbox › Partners from M12)."
      frames="01-CompanyForm, 12-PartnersStates"
    >
      <div className="max-w-190 rounded-2xl border border-line bg-white p-5 lg:p-8">
        <CompanyForm siteName="EESTEC LC Skopje" email="partners@eestec.mk" offerUrl={null} />
      </div>
    </DsSection>
  );
}
