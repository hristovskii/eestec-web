import type { IdeaFormSettings } from '../../types';

// SAMPLE DATA, from handoff/design-source/SubmitForm.dc.html and AdminIdeas.dc.html: the five idea
// types and the line under each tab's title (docs/sample-data.md). The board rewrites them in Form settings.
export const formFixture: IdeaFormSettings = {
  intro: {
    idea: {
      mk: 'Идеи за настани, теми за работилници, компании или оваа веб-страница.',
      en: 'Ideas for events, workshop topics, companies or this website.',
    },
    impression: {
      mk: 'Кажете им на организаторите како беше.',
      en: 'Tell the organizers how it went.',
    },
  },
  types: [
    { id: 'itype-event', name: { mk: 'Нов настан', en: 'New event' } },
    { id: 'itype-workshop', name: { mk: 'Тема за работилница', en: 'Workshop topic' } },
    { id: 'itype-partner', name: { mk: 'Партнерство / компанија', en: 'Partnership / company' } },
    { id: 'itype-website', name: { mk: 'Подобрување на веб-страницата', en: 'Website improvement' } },
    { id: 'itype-other', name: { mk: 'Друго', en: 'Other' } },
  ],
};
