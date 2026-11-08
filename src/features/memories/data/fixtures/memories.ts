import type { MemoryContent, MemoryCover, MemoryPhoto, MemoryRecord } from '../../types';

// SAMPLE DATA (docs/sample-data.md): fictional Memories written by the sample members, about the
// sample events. The canvas draws cards for MemoriesList, MemoryPost and the approval queue; the
// stories themselves are made up here, with striped placeholder photos (no files). Authors are the
// sample members of `auth` / `members` (u-marija is the signed-in sample member Marija).
//
// The queue has four entries (the dashboard says 4): Marija's "Seven days…", Ana's, Stefan's and a
// waiting revision of Marija's published Delft Memory. Marija also has a draft and a Memory the
// board did not approve, so /profile shows every status.

const story = (...paragraphs: string[]) => paragraphs.map((text) => `<p>${text}</p>`).join('');

const cover = (sample: string, alt: string, credit = ''): MemoryCover => ({
  fileId: null,
  sample,
  alt,
  credit,
});

const photos = (id: string, items: [string, string][]): MemoryPhoto[] =>
  items.map(([sample, alt], index) => ({
    id: `${id}-p${index + 1}`,
    fileId: null,
    sample,
    alt,
    caption: index === 0 ? sample : '',
  }));

const content = (
  patch: Partial<MemoryContent> & Pick<MemoryContent, 'title' | 'city' | 'country'>,
): MemoryContent => ({
  eventId: null,
  otherEventName: '',
  happenedOn: null,
  body: '',
  cover: null,
  photos: [],
  ...patch,
});

const base = (
  id: string,
  authorId: string | null,
  at: string,
  record: Partial<MemoryRecord> & Pick<MemoryRecord, 'content'>,
): MemoryRecord => ({
  id,
  slug: null,
  authorId,
  authorDeleted: authorId === null,
  status: 'published',
  source: 'editor',
  rejectionReason: '',
  reviewedByName: 'Ivana Kostova',
  reviewedAt: null,
  submittedAt: null,
  publishedAt: at,
  featuredOnHome: false,
  readsCount: 0,
  revision: null,
  createdAt: at,
  updatedAt: at,
  ...record,
});

const LAB_DAY = story(
  'I signed up for Power Up because I wanted to understand why my grid-simulation homework never balanced. I did not expect the answer to involve a hard hat.',
  'The lab day at FEEIT was the best of the week. We split into teams of four, each with a small model of a grid: one solar plant, one gas plant, a city that wakes up and goes to sleep. The task was simple to say and hard to do: keep the frequency steady through a cloudy afternoon.',
  'My team failed twice. The third time a student from Lisbon suggested we stop chasing the sun and start planning for the clouds, and the numbers finally stayed flat. The jury, two engineers from a local energy company, asked us how we would explain the result to someone who has never opened a textbook. That question stayed with me longer than the answer.',
  'If you are thinking about applying for the next one: you do not need to know anything about power systems. You need to be curious and willing to be wrong in front of strangers.',
);

const OHRID_BUS = story(
  'There is a point on every international event where the group stops being 28 strangers. For us it was somewhere on the road to Ohrid, on a bus with a broken air conditioner and a driver who knew every song.',
  'We left Skopje at nine. By ten the Spanish group had taught the whole bus a clapping game, by eleven the Poles had answered with a song, and by noon we had stopped at a roadside stand and bought far too many peaches.',
  'The rest of the weekend, the old town, the lake, the international night where everyone brought something from home, was wonderful. But when I think about Power Up, I think about that bus.',
);

const DELFT = story(
  'The plan for the exchange said five days, three workshops and a bike for everyone. It said nothing about the weather, and I learned why on the first morning.',
  'Delft is small enough to cross in twenty minutes and wet enough to make every one of them an adventure. The local committee had a rule: if you are late because of the rain, you buy the coffee. By Wednesday I owed eleven coffees.',
  'We visited a lab that builds sensors for wind turbines, spent an evening in a student house arguing about the right way to make stroopwafels, and cycled to the sea on the last day. It rained the whole way. Nobody complained.',
);

const DELFT_REVISION = story(
  'The plan for the exchange said five days, three workshops and a bike for everyone. It said nothing about the weather, and I learned why on the first morning.',
  'Delft is small enough to cross in twenty minutes and wet enough to make every one of them an adventure. The local committee had a rule: if you are late because of the rain, you buy the coffee. By Wednesday I owed eleven coffees.',
  'We visited a lab that builds sensors for wind turbines, spent an evening in a student house arguing about the right way to make stroopwafels, and cycled to the sea on the last day. It rained the whole way. Nobody complained.',
  'A note for anyone going next year: pack a second pair of shoes. The local committee will lend you everything else.',
);

const GRID = story(
  'Before Power Up I thought a power grid was wires. After it I think a grid is a conversation that never stops: producers and consumers agreeing, every second, on how much is enough.',
  'The lecture that changed my mind was given by an engineer who works in a control room. She showed a recording of the evening a large plant went offline and the frequency dropped in a few seconds. The room was silent. Then she showed how the other plants answered, one after another, and the line came back up.',
  'I left the lecture wanting to work on something that matters to everyone and that nobody notices until it breaks.',
);

const EESTECH = story(
  'The EESTech Challenge local round is the one event of the year where I am happy to be nervous. Eight teams, six hours, one problem that nobody has seen before.',
  'This year the problem was about sorting parcels with as few robots as possible. We built our solution on a whiteboard, threw it away at lunch and rebuilt it in the last hour. We came third and I have never been prouder of a third place.',
  'What I like most is that the jury stays to talk afterwards. They are not looking for the right answer, they are looking for people who can explain why they chose the one they did.',
);

const TALLINN = story(
  'I went to Tallinn in February because it was the only city with a free bed and an open EESTEC committee. I came home with a new favourite sauna and three friends I still write to every week.',
  'The local committee organised a walk through the old town, a visit to a startup that makes tiny satellites, and a night of board games that ended with a very serious argument about the rules of a game nobody had finished.',
  'If you ever have the chance to visit another local committee, go. The best part is not the sights. It is being welcomed by people who owe you nothing.',
);

const PCB = story(
  'My first printed circuit board took two evenings to draw and eleven seconds to ruin. I connected the power to the wrong pin and a very small chip went quiet for good.',
  'The KiCad workshop did not make me good at it. It made me unafraid of it. By the end of the second day I had a board that blinked, and a list of mistakes I will never make again, which is more than I can say for most of my homework.',
);

const ROBOMAC_2025 = story(
  'RoboMac 2025 had 26 teams, one very long line for the soldering irons and the loudest cheering I have heard in a lecture hall.',
  'I was in the organising team, which meant I saw the competition from the side nobody sees: the one where you carry tables at seven in the morning and hide a spare battery in your backpack just in case. It was worth every table.',
);

const PRAGUE = story(
  'The night train from Vienna was supposed to arrive at six. It arrived at nine, which is why I saw the whole of Prague at breakfast time with a rucksack and no plan.',
  'The local committee took us to a bridge, a bakery and a roof where the whole city turned gold. I still think about the bakery.',
);

const SEVEN_DAYS = story(
  'Seven days, 28 nationalities and one very long bus ride to Ohrid. Here is what I will remember from Power Up, written down before I forget it.',
  'The first morning, at the FEEIT entrance, nobody knew anybody. By the third, we had a group chat with 28 flags in its name and a rule that nobody eats alone. The week had lectures and labs and a day at a solar plant, but the thing I will remember is the clapping game on the bus.',
  'Thank you to the 16 organisers who made it look easy. I know how much work it was.',
);

const KRAKOW = story(
  'Krakow in winter looks like a postcard somebody forgot to colour in. We walked from the market square to the river in minus eight, ate soup in a milk bar and came back to the hostel with frozen fingers and a very good mood.',
  'This was my second time in Krakow with EESTEC, and the first time with a camera that worked in the cold.',
);

export const memoriesFixture: MemoryRecord[] = [
  // ─── Published ───
  base('mem-lab-day', 'u-daniel', '2026-06-02T10:00:00+02:00', {
    slug: 'power-up-the-lab-day-i-did-not-expect',
    featuredOnHome: true,
    readsCount: 1240,
    reviewedAt: '2026-06-02T10:00:00+02:00',
    content: content({
      title: 'Power Up: the lab day I did not expect',
      eventId: 'ev-power-up-2026',
      city: 'Skopje',
      country: 'North Macedonia',
      happenedOn: '2026-05-20',
      body: LAB_DAY,
      cover: cover(
        'The grid challenge: four students around a model of a power grid',
        'Four students around a table-sized model of a power grid, one pointing at a gauge',
        'Daniel Ristov',
      ),
      photos: photos('mem-lab-day', [
        ['Opening session at FEEIT', 'Students sitting in a lecture hall, listening to the opening speech'],
        ['Hard hats at the solar plant', 'Students in hard hats walking between rows of solar panels'],
        ['The grid challenge', 'A team bending over a laptop and a model of a power grid'],
        ['Team presentations', 'A student presenting a graph to a jury of two engineers'],
        ['International night', 'Tables with food and flags from fourteen countries'],
        ['Ohrid, old town', 'Narrow stone street leading down to the lake'],
        ['Group photo', 'All participants in front of the faculty building'],
      ]),
    }),
  }),
  base('mem-delft', 'u-marija', '2026-05-02T09:00:00+02:00', {
    slug: 'five-days-in-delft-zero-days-of-sun',
    readsCount: 318,
    reviewedAt: '2026-05-02T09:00:00+02:00',
    content: content({
      title: 'Five days in Delft, zero days of sun',
      eventId: 'ev-delft-by-bike',
      city: 'Delft',
      country: 'Netherlands',
      happenedOn: '2026-04-16',
      body: DELFT,
      cover: cover(
        'A row of bikes in the rain on a Delft canal',
        'Bikes parked along a canal in the rain',
        'Marija Stojanovska',
      ),
      photos: photos('mem-delft', [
        ['Canal in the rain', 'A canal with bikes and wet cobblestones'],
        ['The wind turbine lab', 'Students in front of a test rig for wind turbine sensors'],
        ['Stroopwafel debate', 'A kitchen table covered in waffles and cups'],
        ['The ride to the sea', 'A line of cyclists on a dyke under a grey sky'],
      ]),
    }),
    // A change the author made after publishing: it waits for the board; the page stays as it is.
    revision: {
      id: 'rev-delft-1',
      status: 'pending',
      reason: '',
      submittedAt: '2026-10-03T16:20:00+02:00',
      reviewedByName: '',
      reviewedAt: null,
      content: content({
        title: 'Five days in Delft, zero days of sun',
        eventId: 'ev-delft-by-bike',
        city: 'Delft',
        country: 'Netherlands',
        happenedOn: '2026-04-16',
        body: DELFT_REVISION,
        cover: cover(
          'A row of bikes in the rain on a Delft canal',
          'Bikes parked along a canal in the rain',
          'Marija Stojanovska',
        ),
        photos: photos('mem-delft', [
          ['Canal in the rain', 'A canal with bikes and wet cobblestones'],
          ['The wind turbine lab', 'Students in front of a test rig for wind turbine sensors'],
          ['Stroopwafel debate', 'A kitchen table covered in waffles and cups'],
          ['The ride to the sea', 'A line of cyclists on a dyke under a grey sky'],
        ]),
      }),
    },
  }),
  base('mem-grid', 'u-ana', '2026-06-09T12:00:00+02:00', {
    slug: 'what-24-students-taught-me-about-the-power-grid',
    readsCount: 402,
    reviewedAt: '2026-06-09T12:00:00+02:00',
    content: content({
      title: 'What 24 students taught me about the power grid',
      eventId: 'ev-power-up-2026',
      city: 'Skopje',
      country: 'North Macedonia',
      happenedOn: '2026-05-21',
      body: GRID,
      cover: cover(
        'The lecture hall during the control-room talk',
        'A full lecture hall watching a graph of the grid frequency',
        'Ana Trajkovska',
      ),
      photos: photos('mem-grid', [
        ['The control-room talk', 'A speaker pointing at a graph on a large screen'],
        ['Questions after the lecture', 'Students lining up at a microphone'],
      ]),
    }),
  }),
  base('mem-eestech', 'u-ivana', '2026-03-24T18:00:00+01:00', {
    slug: 'why-i-keep-coming-back-to-eestech',
    readsCount: 211,
    reviewedAt: '2026-03-24T18:00:00+01:00',
    content: content({
      title: 'Why I keep coming back to EESTech',
      eventId: 'ev-eestech-challenge-2026-skopje',
      city: 'Skopje',
      country: 'North Macedonia',
      happenedOn: '2026-03-14',
      body: EESTECH,
      cover: cover(
        'Eight teams at long tables, laptops open',
        'Teams working at long tables with laptops and whiteboards',
        'Ivana Kostova',
      ),
      photos: photos('mem-eestech', [
        ['Whiteboard, first version', 'A whiteboard covered in boxes and arrows'],
        ['The jury listens', 'Three jury members listening to a student presentation'],
        ['The third place', 'A team holding a certificate and laughing'],
      ]),
    }),
  }),
  base('mem-tallinn', 'u-daniel', '2026-02-26T11:00:00+01:00', {
    slug: 'a-week-in-tallinn-and-a-very-good-sauna',
    readsCount: 164,
    reviewedAt: '2026-02-26T11:00:00+01:00',
    content: content({
      title: 'A week in Tallinn and a very good sauna',
      otherEventName: 'Visit to LC Tallinn',
      city: 'Tallinn',
      country: 'Estonia',
      happenedOn: '2026-02-12',
      body: TALLINN,
      cover: cover(
        'Old town rooftops covered in snow',
        'Snow-covered rooftops of Tallinn old town at dusk',
        'Daniel Ristov',
      ),
      photos: photos('mem-tallinn', [
        ['The old town walk', 'A group walking through a narrow snowy street'],
        ['The satellite startup', 'A table with a tiny satellite and a ruler next to it'],
        ['Board game night', 'Six people around a board game with a pile of cards'],
      ]),
    }),
  }),
  base('mem-pcb', 'u-ana', '2026-03-05T14:00:00+01:00', {
    slug: 'my-first-pcb-and-the-chip-that-went-quiet',
    readsCount: 97,
    reviewedAt: '2026-03-05T14:00:00+01:00',
    content: content({
      title: 'My first PCB, and the chip that went quiet',
      eventId: 'ev-pcb-design-kicad',
      city: 'Skopje',
      country: 'North Macedonia',
      happenedOn: '2026-02-27',
      body: PCB,
      cover: cover(
        'A small blinking circuit board on a desk',
        'A small circuit board with a blinking LED on a desk',
        'Ana Trajkovska',
      ),
      photos: photos('mem-pcb', [['The board that blinked', 'A circuit board with one LED lit']]),
    }),
  }),
  base('mem-robomac-25', 'u-stefan', '2025-05-12T09:00:00+02:00', {
    slug: 'robomac-2025-from-the-side-nobody-sees',
    readsCount: 188,
    reviewedAt: '2025-05-12T09:00:00+02:00',
    content: content({
      title: 'RoboMac 2025, from the side nobody sees',
      eventId: 'ev-robomac-2025',
      city: 'Skopje',
      country: 'North Macedonia',
      happenedOn: '2025-04-12',
      body: ROBOMAC_2025,
      cover: cover(
        'Teams soldering in a crowded lecture hall',
        'Students soldering robot parts at crowded tables',
        'Stefan Nikolovski',
      ),
      photos: photos('mem-robomac-25', [
        ['Soldering line', 'A queue of students waiting for a soldering iron'],
        ['The final round', 'Two small robots facing each other in an arena'],
      ]),
    }),
  }),
  // Written by a member who has since deleted their account: shown as "A former member".
  base('mem-prague', null, '2025-09-03T10:00:00+02:00', {
    slug: 'a-night-train-and-a-bakery-in-prague',
    readsCount: 76,
    reviewedAt: '2025-09-03T10:00:00+02:00',
    content: content({
      title: 'A night train and a bakery in Prague',
      otherEventName: 'Visit to LC Praha',
      city: 'Prague',
      country: 'Czechia',
      happenedOn: '2025-08-22',
      body: PRAGUE,
      cover: cover('A bridge at sunrise', 'A stone bridge over a river at sunrise', ''),
      photos: photos('mem-prague', [['The bakery', 'A bakery window full of pastries']]),
    }),
  }),

  // ─── Waiting for the board (4 in the queue with Marija's revision) ───
  base('mem-seven-days', 'u-marija', '2026-10-02T09:00:00+02:00', {
    slug: 'seven-days-28-nationalities-and-one-very-long-bus-ride-to-ohrid',
    status: 'pending',
    publishedAt: null,
    reviewedByName: '',
    submittedAt: '2026-10-02T09:12:00+02:00',
    updatedAt: '2026-10-02T09:12:00+02:00',
    content: content({
      title: 'Seven days, 28 nationalities and one very long bus ride to Ohrid',
      eventId: 'ev-power-up-2026',
      city: 'Ohrid',
      country: 'North Macedonia',
      happenedOn: '2026-05-24',
      body: SEVEN_DAYS + OHRID_BUS,
      cover: cover(
        'The group on the lakeside in Ohrid',
        'Twenty-eight students standing in a row on the lakeside promenade',
        'Marija Stojanovska',
      ),
      photos: photos('mem-seven-days', [
        ['The bus', 'A tour bus with open windows on a mountain road'],
        ['Lakeside', 'Students sitting on the stones at the edge of the lake'],
        ['International night', 'A table with food from many countries'],
        ['The old town', 'A cobbled street in the old town of Ohrid'],
        ['Group at the fortress', 'The group on the wall of the fortress at sunset'],
        ['The ride home', 'Students asleep on the bus with a pile of backpacks'],
      ]),
    }),
  }),
  base('mem-rust', 'u-ana', '2026-10-03T08:00:00+02:00', {
    slug: 'two-days-of-embedded-rust-and-one-borrow-checker',
    status: 'pending',
    publishedAt: null,
    reviewedByName: '',
    submittedAt: '2026-10-03T08:30:00+02:00',
    updatedAt: '2026-10-03T08:30:00+02:00',
    content: content({
      title: 'Two days of embedded Rust and one borrow checker',
      eventId: 'ev-embedded-rust-2025',
      city: 'Skopje',
      country: 'North Macedonia',
      happenedOn: '2025-11-08',
      body: story(
        'The workshop promised that Rust would stop me from making mistakes on a microcontroller. What it did first was stop me from compiling anything at all.',
        'By the second afternoon the borrow checker and I had come to an understanding, and the board on my desk blinked in the pattern I had written.',
      ),
      cover: cover(
        'A development board connected to a laptop',
        'A small development board with a cable running to a laptop',
        'Ana Trajkovska',
      ),
      photos: photos('mem-rust', [['The first blink', 'A development board with a green LED on']]),
    }),
  }),
  base('mem-robomac-26', 'u-stefan', '2026-10-04T08:00:00+02:00', {
    slug: 'robomac-2026-a-fan-of-the-small-robots',
    status: 'pending',
    publishedAt: null,
    reviewedByName: '',
    submittedAt: '2026-10-04T08:25:00+02:00',
    updatedAt: '2026-10-04T08:25:00+02:00',
    content: content({
      title: 'RoboMac 2026: a fan of the small robots',
      eventId: 'ev-robomac-2026',
      city: 'Skopje',
      country: 'North Macedonia',
      happenedOn: '2026-04-11',
      body: story(
        'There is a robot at RoboMac that is smaller than a matchbox and has won two years in a row. I went to find out why.',
        'The team behind it told me the secret: it is not the motors, it is the patience to tune the sensors until the very last minute.',
      ),
      cover: cover(
        'A tiny robot on a black arena line',
        'A very small robot on a black line in a white arena',
        'Stefan Nikolovski',
      ),
      photos: [],
    }),
  }),

  // ─── Marija's draft and a Memory the board did not approve ───
  base('mem-robomac-draft', 'u-marija', '2026-10-05T19:00:00+02:00', {
    status: 'draft',
    publishedAt: null,
    reviewedByName: '',
    updatedAt: '2026-10-07T18:42:00+02:00',
    content: content({
      title: 'Notes from the RoboMac jury table',
      eventId: 'ev-robomac-2026',
      city: 'Skopje',
      country: 'North Macedonia',
      body: story(
        'I sat at the jury table for the first time this year. Here is what I wrote down while the robots ran.',
      ),
    }),
  }),
  base('mem-krakow', 'u-marija', '2026-09-20T12:00:00+02:00', {
    slug: 'krakow-in-the-snow-part-two',
    status: 'rejected',
    publishedAt: null,
    rejectionReason:
      'Lovely story. Please add a description to each photo and a cover photo that shows people, not only snow. Then send it again and we will publish it.',
    reviewedByName: 'Ivana Kostova',
    reviewedAt: '2026-10-01T10:00:00+02:00',
    submittedAt: '2026-09-28T20:10:00+02:00',
    updatedAt: '2026-10-01T10:00:00+02:00',
    content: content({
      title: 'Kraków in the snow, part two',
      otherEventName: 'Krakow Winter Exchange (visit)',
      city: 'Kraków',
      country: 'Poland',
      happenedOn: '2026-01-18',
      body: KRAKOW,
      cover: cover('The market square under snow', '', ''),
      photos: photos('mem-krakow', [
        ['Milk bar soup', ''],
        ['The river at minus eight', ''],
      ]),
    }),
  }),
];
