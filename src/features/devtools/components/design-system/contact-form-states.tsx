import { ContactForm } from '@/features/contact';

import { DsSection } from './ds-section';

// The lab's own subjects (a feature's tests and fixtures stay inside the feature): the two that
// suggest a faster page and one that does not.
const SUBJECTS = [
  { id: 'subject-general', name: 'General question', teamLabel: 'board', suggestion: null },
  {
    id: 'subject-membership',
    name: 'Membership',
    teamLabel: 'membership team',
    suggestion: {
      note: 'Want to join? The quickest way is the membership form.',
      label: 'Join Us →',
      href: '/join#apply',
    },
  },
  {
    id: 'subject-partnership',
    name: 'Partnership',
    teamLabel: 'fundraising team',
    suggestion: {
      note: 'Companies: our packages and the partnership offer are on the For Companies page. This message goes straight to our fundraising team.',
      label: 'For Companies →',
      href: '/partners',
    },
  },
];

export function ContactFormStatesSection() {
  return (
    <DsSection
      id="contact-form-states"
      title="Contact form"
      intro="The real ContactForm: choose Membership or Partnership for the routing note, send it empty for the error summary, fill it in for “Sending…” and the confirmation. Sent from here it is stored like any message (sample data, shown in Inbox › Contact messages from M12d)."
      frames="01-ContactForm, 13-ContactStates"
    >
      <div className="max-w-190">
        <ContactForm
          form={{ title: 'Send us a message', intro: 'We usually reply within 2 working days.' }}
          subjects={SUBJECTS}
          siteName="EESTEC LC Skopje"
          email="hello@eestec.mk"
        />
      </div>
    </DsSection>
  );
}
