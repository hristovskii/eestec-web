'use client';

import * as React from 'react';

import { Link } from '@/shared/i18n/navigation';

import { Checkbox, ChoiceLabel, Radio } from '@/shared/ui/form/choice';
import { ConsentField } from '@/shared/ui/form/consent-field';
import { ErrorSummary } from '@/shared/ui/form/error-summary';
import { FileDropzone } from '@/shared/ui/form/file-dropzone';
import { FormCard, FormField } from '@/shared/ui/form/form-field';
import { FormSuccess, SuccessLine } from '@/shared/ui/form/form-success';
import { SegmentedChoice } from '@/shared/ui/form/segmented-choice';
import { StarRating } from '@/shared/ui/form/star-rating';
import { Honeypot, SubmitButton } from '@/shared/ui/form/submit-button';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Switch } from '@/shared/ui/primitives/switch';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { DsLabel, DsSection } from './ds-section';

// SAMPLE copy from handoff/design-source/Main.dc.html (Form fields) and JoinForm.dc.html.
const MOTIVATION =
  'I want to try embedded ML on real hardware and meet students working on the same problems in other countries.';

export function FormsSection() {
  const [motivation, setMotivation] = React.useState(MOTIVATION);
  const [sending, setSending] = React.useState(false);
  const [year, setYear] = React.useState<string[]>([]);
  const [interests, setInterests] = React.useState<string[]>(['it', 'events']);

  return (
    <DsSection
      id="forms"
      title="Form fields"
      intro="Label above the field, red focus ring, errors with an icon and text (never color alone). States: empty, errors (summary + inline), sending, success."
      frames="01-Main, 01-JoinForm, 11-JoinFormStates"
    >
      <form
        className="grid max-w-[960px] gap-x-8 gap-y-6 md:grid-cols-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <FormField id="f-name" label="Full name" help="As written on your student ID.">
          {(control) => <Input {...control} type="text" placeholder="e.g. Marija Stojanovska" />}
        </FormField>
        <FormField id="f-email" label="E-mail" required>
          {(control) => <Input {...control} type="email" defaultValue="marija.s@students.feit.ukim.edu.mk" />}
        </FormField>
        <FormField id="f-phone" label="Phone" error="Enter a full phone number, e.g. 070 123 456.">
          {(control) => <Input {...control} type="tel" defaultValue="070 12" />}
        </FormField>
        <FormField id="f-year" label="Year of study">
          {(control) => (
            <NativeSelect {...control} defaultValue="2">
              <NativeSelectOption value="1">1st year</NativeSelectOption>
              <NativeSelectOption value="2">2nd year</NativeSelectOption>
              <NativeSelectOption value="3">3rd year</NativeSelectOption>
              <NativeSelectOption value="4">4th year</NativeSelectOption>
              <NativeSelectOption value="master">Master&apos;s</NativeSelectOption>
            </NativeSelect>
          )}
        </FormField>
        <FormField
          id="f-motivation"
          label="Why do you want to join this workshop?"
          help="Keep it under 1,500 characters."
          counter={`${motivation.length} / 1,500`}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              {...control}
              rows={4}
              maxLength={1500}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
            />
          )}
        </FormField>
        <FileDropzone id="f-cv" name="cv" label="CV (PDF, max 5 MB)" accept="application/pdf" />
        <div className="flex flex-col justify-center gap-3.5">
          <ChoiceLabel control={<Checkbox defaultChecked />}>
            I agree that EESTEC LC Skopje processes my personal data for this application.{' '}
            <Link href="/privacy">Privacy policy</Link>
          </ChoiceLabel>
          <ChoiceLabel control={<Radio name="member" defaultChecked />}>
            I&apos;m already an EESTEC member
          </ChoiceLabel>
          <ChoiceLabel control={<Radio name="member" />}>Not a member yet</ChoiceLabel>
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-2 md:col-span-2">
          <SubmitButton
            sending={sending}
            onClick={() => {
              setSending(true);
              window.setTimeout(() => setSending(false), 2000);
            }}
          >
            Submit application
          </SubmitButton>
          <SuccessLine>
            Application sent. We e-mailed a confirmation to marija.s@students.feit.ukim.edu.mk.
          </SuccessLine>
        </div>
        <Honeypot />
      </form>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <DsLabel>Segmented choices · switch · rating</DsLabel>
          <SegmentedChoice
            name="year"
            type="radio"
            legend="Year of study"
            required
            value={year}
            onChange={setYear}
            error={year.length ? undefined : 'Choose your year of study'}
            options={['1st', '2nd', '3rd', '4th', "Master's", 'PhD'].map((label) => ({
              value: label,
              label,
            }))}
          />
          <SegmentedChoice
            name="interests"
            type="checkbox"
            legend="What would you like to do?"
            hint="Pick any"
            value={interests}
            onChange={setInterests}
            help="IT, PR, design, events, fundraising or trainings. You can change this later."
            options={[
              { value: 'it', label: 'IT' },
              { value: 'pr', label: 'PR' },
              { value: 'design', label: 'Design' },
              { value: 'events', label: 'Events' },
              { value: 'fundraising', label: 'Fundraising' },
              { value: 'trainings', label: 'Trainings' },
            ]}
          />
          <label className="flex items-center gap-3 text-small">
            <Switch defaultChecked aria-describedby="anon-help" />
            <span>
              Submit anonymously
              <span id="anon-help" className="block text-muted-ink">
                We won&apos;t see who you are, so we can&apos;t reply to you.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-3 text-small">
            <Switch size="sm" />
            Admin switch (36 × 20)
          </label>
          <StarRating name="rating" legend="How was it?" optional defaultValue={4} />
        </div>
        <div className="flex flex-col gap-6">
          <DsLabel>Error summary · consent</DsLabel>
          <ErrorSummary
            title="Please fix 3 fields"
            errors={[
              { fieldId: 'f-email', message: 'E-mail' },
              { fieldId: 'year', message: 'Year of study' },
              { fieldId: 'f-consent', message: 'Consent to data processing' },
            ]}
          />
          <ConsentField id="f-consent" error="Please agree so we can process your application">
            I agree that EESTEC LC Skopje stores and processes my personal data to handle my membership
            application, as described in the privacy policy. I can ask for my data to be deleted at any time.
          </ConsentField>
          <ConsentField id="f-consent-ok" defaultChecked>
            I agree that EESTEC LC Skopje stores my name and e-mail to reply to this message.
          </ConsentField>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <DsLabel>Success state (replaces the form)</DsLabel>
        <FormCard className="max-w-[720px]">
          <FormSuccess
            title="Welcome aboard, Marija!"
            nextTitle="What happens next"
            steps={[
              'We’ll reply within 3 days.',
              'Come to the next weekly meeting: Wed 14 Oct, 18:00, room 117, FEEIT.',
              'Pick a team and meet your mentor.',
            ]}
            actions={
              <>
                <Button variant="secondary">Add meeting to calendar</Button>
                <Button variant="ghost">See the EESTEC Journey →</Button>
              </>
            }
          >
            Your application is in. We sent a confirmation to marija.s@students.feit.ukim.edu.mk.
          </FormSuccess>
        </FormCard>
      </div>
    </DsSection>
  );
}
