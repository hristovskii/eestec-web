# Canvas frames

Every frame on the canvas, in canvas order. `design-source/*.dc.html` files are Claude Design components (HTML + CSS + a small `renderVals()` with sample data). Read them for exact markup, spacing, copy and states; they are not meant to run in Next.js as-is. Image references `/_blob/<id>` are listed in `design-source/assets/README.md`.

## 0 · Developer handoff — start here

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| DevHandoff-1 | Developer handoff 1/3 · overview, phases & routes | screens/00-DevHandoff-1.jpg | design-source/DevHandoff-1.dc.html |
| DevHandoff-2 | Developer handoff 2/3 · components, rules & settings | screens/00-DevHandoff-2.jpg | design-source/DevHandoff-2.dc.html |
| DevHandoff-3 | Developer handoff 3/3 · data model for Supabase | screens/00-DevHandoff-3.jpg | design-source/DevHandoff-3.dc.html |

## 1 · Design system & shared components · spec 00

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| Main | Design System (first 8000px) | screens/01-Main.jpg | design-source/Main.dc.html |
| Header | Component · Header | screens/01-Header.jpg | design-source/Header.dc.html |
| Footer | Component · Footer | screens/01-Footer.jpg | design-source/Footer.dc.html |
| EventCard | Component · Card (event / memory) | screens/01-EventCard.jpg | design-source/EventCard.dc.html |
| CommitteeMap | Component · Committee map | screens/01-CommitteeMap.jpg | design-source/CommitteeMap.dc.html |
| ApplyBox | Component · Application box | screens/01-ApplyBox.jpg | design-source/ApplyBox.dc.html |
| JourneyStep | Component · Journey step card | screens/01-JourneyStep.jpg | design-source/JourneyStep.dc.html |
| JoinForm | Component · Membership form | screens/01-JoinForm.jpg | design-source/JoinForm.dc.html |
| PartnerLogo | Component · Partner logo cell | screens/01-PartnerLogo.jpg | design-source/PartnerLogo.dc.html |
| PartnerLogos | Component · Partner logos by tier | screens/01-PartnerLogos.jpg | design-source/PartnerLogos.dc.html |
| CompanyForm | Component · Partnership inquiry form | screens/01-CompanyForm.jpg | design-source/CompanyForm.dc.html |
| ContactForm | Component · Contact form | screens/01-ContactForm.jpg | design-source/ContactForm.dc.html |
| AdminSidebar | Component · Admin sidebar | screens/01-AdminSidebar.jpg | design-source/AdminSidebar.dc.html |
| AdminTopbar | Component · Admin top bar | screens/01-AdminTopbar.jpg | design-source/AdminTopbar.dc.html |
| AdminMobile | Component · Admin mobile screen | screens/01-AdminMobile.jpg | design-source/AdminMobile.dc.html |
| MemberCard | Component · Member card | screens/01-MemberCard.jpg | design-source/MemberCard.dc.html |
| AuthForm | Component · Member log in / sign-up card | screens/01-AuthForm.jpg | design-source/AuthForm.dc.html |
| SubmitForm | Component · Idea / impression form | screens/01-SubmitForm.jpg | design-source/SubmitForm.dc.html |
| Main-Continued | Design System · continued (end of the page) | screens/01-Main-Continued.jpg | design-source/Main-Continued.dc.html |

## 2 · Home — desktop & mobile · spec 01

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| Home-Desktop | Home · Desktop | screens/02-Home-Desktop.jpg | design-source/Home-Desktop.dc.html |
| Home-Mobile | Home · Mobile (first 8000px) | screens/02-Home-Mobile.jpg | design-source/Home-Mobile.dc.html |
| Home-Mobile-Continued | Home · Mobile · continued (partners + footer) | screens/02-Home-Mobile-Continued.jpg | design-source/Home-Mobile-Continued.dc.html |

## 3 · Events archive — results, no results, loading · spec 02

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| EventsList | Events · Desktop · Results | screens/03-EventsList.jpg | design-source/EventsList.dc.html |
| EventsList-Empty | Events · Desktop · No results | screens/03-EventsList-Empty.jpg | design-source/EventsList-Empty.dc.html |
| EventsList-Loading | Events · Desktop · Loading | screens/03-EventsList-Loading.jpg | design-source/EventsList-Loading.dc.html |
| EventsList-Mobile | Events · Mobile · Results | screens/03-EventsList-Mobile.jpg | design-source/EventsList-Mobile.dc.html |
| EventsList-Mobile-Empty | Events · Mobile · No results | screens/03-EventsList-Mobile-Empty.jpg | design-source/EventsList-Mobile-Empty.dc.html |
| EventsList-Mobile-Loading | Events · Mobile · Loading | screens/03-EventsList-Mobile-Loading.jpg | design-source/EventsList-Mobile-Loading.dc.html |
| EventsList-Mobile-Filters | Events · Mobile · Filters sheet | screens/03-EventsList-Mobile-Filters.jpg | design-source/EventsList-Mobile-Filters.dc.html |

## 4 · Event detail, lightbox & minimal-content version · spec 02

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| EventDetail | Event detail · Desktop | screens/04-EventDetail.jpg | design-source/EventDetail.dc.html |
| EventDetail-Mobile | Event detail · Mobile | screens/04-EventDetail-Mobile.jpg | design-source/EventDetail-Mobile.dc.html |
| Lightbox | Gallery lightbox · Desktop | screens/04-Lightbox.jpg | design-source/Lightbox.dc.html |
| Lightbox-Mobile | Gallery lightbox · Mobile | screens/04-Lightbox-Mobile.jpg | design-source/Lightbox-Mobile.dc.html |
| EventDetail-Minimal | Event detail · Desktop · Minimal content | screens/04-EventDetail-Minimal.jpg | design-source/EventDetail-Minimal.dc.html |

## 5 · Upcoming Events — list & empty state · spec 03

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| UpcomingList | Upcoming · Desktop · List | screens/05-UpcomingList.jpg | design-source/UpcomingList.dc.html |
| UpcomingList-Empty | Upcoming · Desktop · No upcoming events | screens/05-UpcomingList-Empty.jpg | design-source/UpcomingList-Empty.dc.html |
| UpcomingList-Mobile | Upcoming · Mobile · List | screens/05-UpcomingList-Mobile.jpg | design-source/UpcomingList-Mobile.dc.html |
| UpcomingList-Mobile-Empty | Upcoming · Mobile · No upcoming events | screens/05-UpcomingList-Mobile-Empty.jpg | design-source/UpcomingList-Mobile-Empty.dc.html |

## 6 · Upcoming event detail, application states & after the event · spec 03

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| UpcomingDetail | Upcoming detail · Desktop · Applications open | screens/06-UpcomingDetail.jpg | design-source/UpcomingDetail.dc.html |
| UpcomingDetail-Mobile | Upcoming detail · Mobile | screens/06-UpcomingDetail-Mobile.jpg | design-source/UpcomingDetail-Mobile.dc.html |
| UpcomingDetail-Mobile-Viewport | Upcoming detail · Mobile · First screen + sticky apply bar | screens/06-UpcomingDetail-Mobile-Viewport.jpg | design-source/UpcomingDetail-Mobile-Viewport.dc.html |
| UpcomingStates | Upcoming · Application states & lifecycle | screens/06-UpcomingStates.jpg | design-source/UpcomingStates.dc.html |
| EventDetail-Ended | After the event · Desktop · /events/ai-at-the-edge | screens/06-EventDetail-Ended.jpg | design-source/EventDetail-Ended.dc.html |
| EventDetail-Ended-Mobile | After the event · Mobile | screens/06-EventDetail-Ended-Mobile.jpg | design-source/EventDetail-Ended-Mobile.dc.html |

## 7 · Members — list, profiles, log in & sign-up, My profile · spec 04

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| MembersPage | Members · Desktop · visitor | screens/07-MembersPage.jpg | design-source/MembersPage.dc.html |
| MembersPage-Mobile | Members · Mobile · visitor | screens/07-MembersPage-Mobile.jpg | design-source/MembersPage-Mobile.dc.html |
| MembersPage-Member | Members · Desktop · logged-in member (members-only profiles shown) | screens/07-MembersPage-Member.jpg | design-source/MembersPage-Member.dc.html |
| MembersPage-Empty | Members · Desktop · no results | screens/07-MembersPage-Empty.jpg | design-source/MembersPage-Empty.dc.html |
| MembersPage-Mobile-Empty | Members · Mobile · no results | screens/07-MembersPage-Mobile-Empty.jpg | design-source/MembersPage-Mobile-Empty.dc.html |
| HeaderStates | Header · logged out, logged in, account menu | screens/07-HeaderStates.jpg | design-source/HeaderStates.dc.html |
| MemberCardStates | Member cards · variants & states | screens/07-MemberCardStates.jpg | design-source/MemberCardStates.dc.html |
| MemberProfile | Member profile · Desktop · public | screens/07-MemberProfile.jpg | design-source/MemberProfile.dc.html |
| MemberProfile-Mobile | Member profile · Mobile | screens/07-MemberProfile-Mobile.jpg | design-source/MemberProfile-Mobile.dc.html |
| MemberProfile-Restricted | Member profile · members-only, seen by a visitor | screens/07-MemberProfile-Restricted.jpg | design-source/MemberProfile-Restricted.dc.html |
| MemberProfile-Restricted-Mobile | Member profile · members-only · Mobile | screens/07-MemberProfile-Restricted-Mobile.jpg | design-source/MemberProfile-Restricted-Mobile.dc.html |
| AuthPage | Log in · Desktop · /login | screens/07-AuthPage.jpg | design-source/AuthPage.dc.html |
| AuthPage-Login-Mobile | Log in · Mobile | screens/07-AuthPage-Login-Mobile.jpg | design-source/AuthPage-Login-Mobile.dc.html |
| AuthPage-Register | Sign up · Desktop · /register | screens/07-AuthPage-Register.jpg | design-source/AuthPage-Register.dc.html |
| AuthPage-Register-Mobile | Sign up · Mobile | screens/07-AuthPage-Register-Mobile.jpg | design-source/AuthPage-Register-Mobile.dc.html |
| AuthPage-Register-Errors | Sign up · validation errors | screens/07-AuthPage-Register-Errors.jpg | design-source/AuthPage-Register-Errors.dc.html |
| AuthStates | Log in & sign-up · all states | screens/07-AuthStates.jpg | design-source/AuthStates.dc.html |
| MyProfile | My profile · Desktop · /profile | screens/07-MyProfile.jpg | design-source/MyProfile.dc.html |
| MyProfile-Mobile | My profile · Mobile | screens/07-MyProfile-Mobile.jpg | design-source/MyProfile-Mobile.dc.html |
| MyProfileStates | My profile · pending, CV, upload, dialogs | screens/07-MyProfileStates.jpg | design-source/MyProfileStates.dc.html |

## 8 · Memories — list, post page, editor & approval states · spec 05

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| MemoriesList | Memories · Desktop · cards (launch: no map toggle) | screens/08-MemoriesList.jpg | design-source/MemoriesList.dc.html |
| MemoriesList-Mobile | Memories · Mobile | screens/08-MemoriesList-Mobile.jpg | design-source/MemoriesList-Mobile.dc.html |
| MemoriesList-Map | Memories · map view · Phase 2 · after launch | screens/08-MemoriesList-Map.jpg | design-source/MemoriesList-Map.dc.html |
| MemoriesList-Mobile-Empty | Memories · Mobile · no results | screens/08-MemoriesList-Mobile-Empty.jpg | design-source/MemoriesList-Mobile-Empty.dc.html |
| MemoryStates | Memories · status flow, editor states & e-mails | screens/08-MemoryStates.jpg | design-source/MemoryStates.dc.html |
| MemoriesList-Empty | Memories · Desktop · no results | screens/08-MemoriesList-Empty.jpg | design-source/MemoriesList-Empty.dc.html |
| MemoryPost | Memory post · Desktop | screens/08-MemoryPost.jpg | design-source/MemoryPost.dc.html |
| MemoryPost-Mobile | Memory post · Mobile | screens/08-MemoryPost-Mobile.jpg | design-source/MemoryPost-Mobile.dc.html |
| MemoryPost-Former | Memory post · by a former member | screens/08-MemoryPost-Former.jpg | design-source/MemoryPost-Former.dc.html |
| MemoryLightbox | Memory gallery · lightbox (reused) | screens/08-MemoryLightbox.jpg | design-source/MemoryLightbox.dc.html |
| MemoryPost-Preview | Memory post · preview before submitting | screens/08-MemoryPost-Preview.jpg | design-source/MemoryPost-Preview.dc.html |
| MemoryPost-ChangesWaiting | Memory post · author sees “Changes waiting for review” | screens/08-MemoryPost-ChangesWaiting.jpg | design-source/MemoryPost-ChangesWaiting.dc.html |
| MemoryPost-ChangesWaiting-Mobile | Memory post · changes waiting · Mobile | screens/08-MemoryPost-ChangesWaiting-Mobile.jpg | design-source/MemoryPost-ChangesWaiting-Mobile.dc.html |
| MemoryLightbox-Mobile | Memory gallery · lightbox · Mobile | screens/08-MemoryLightbox-Mobile.jpg | design-source/MemoryLightbox-Mobile.dc.html |
| MemoryEditor | Write a Memory · Desktop · draft | screens/08-MemoryEditor.jpg | design-source/MemoryEditor.dc.html |
| MemoryEditor-Mobile | Write a Memory · Mobile | screens/08-MemoryEditor-Mobile.jpg | design-source/MemoryEditor-Mobile.dc.html |
| MemoryEditor-Errors | Write a Memory · submit with errors | screens/08-MemoryEditor-Errors.jpg | design-source/MemoryEditor-Errors.dc.html |
| MemoryEditor-Rejected | Write a Memory · not approved → edit and resubmit | screens/08-MemoryEditor-Rejected.jpg | design-source/MemoryEditor-Rejected.dc.html |
| MemoryEditor-LiveEdit | Write a Memory · editing a published Memory | screens/08-MemoryEditor-LiveEdit.jpg | design-source/MemoryEditor-LiveEdit.dc.html |

## 9 · Submit an idea / impression — public form & admin side · spec 06

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| SubmitPage | Submit · Desktop · idea (visitor) · /submit | screens/09-SubmitPage.jpg | design-source/SubmitPage.dc.html |
| SubmitPage-Mobile | Submit · Mobile · idea | screens/09-SubmitPage-Mobile.jpg | design-source/SubmitPage-Mobile.dc.html |
| SubmitPage-Impression | Submit · Desktop · impression (member, from an event link) · /submit?tab=impression | screens/09-SubmitPage-Impression.jpg | design-source/SubmitPage-Impression.dc.html |
| SubmitPage-Mobile-Impression | Submit · Mobile · impression (visitor) | screens/09-SubmitPage-Mobile-Impression.jpg | design-source/SubmitPage-Mobile-Impression.dc.html |
| SubmitStates | Ideas & impressions · all form states | screens/09-SubmitStates.jpg | design-source/SubmitStates.dc.html |
| AdminIdeas | Admin · Ideas & Feedback · Ideas | screens/09-AdminIdeas.jpg | design-source/AdminIdeas.dc.html |
| AdminIdeas-Feedback | Admin · Ideas & Feedback · Event feedback | screens/09-AdminIdeas-Feedback.jpg | design-source/AdminIdeas-Feedback.dc.html |
| AdminIdeas-Ratings | Admin · Ideas & Feedback · Ratings per event | screens/09-AdminIdeas-Ratings.jpg | design-source/AdminIdeas-Ratings.dc.html |
| AdminIdeas-Settings | Admin · /submit form settings | screens/09-AdminIdeas-Settings.jpg | design-source/AdminIdeas-Settings.dc.html |

## 10 · EESTEC Journey — desktop, mobile & interaction states · spec 07

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| Journey | EESTEC Journey · Desktop | screens/10-Journey.jpg | design-source/Journey.dc.html |
| Journey-Mobile | EESTEC Journey · Mobile | screens/10-Journey-Mobile.jpg | design-source/Journey-Mobile.dc.html |
| JourneyStates | EESTEC Journey · Interaction states | screens/10-JourneyStates.jpg | design-source/JourneyStates.dc.html |

## 11 · Join Us — page, FAQ & membership form states · spec 08

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| JoinPage | Join Us · Desktop | screens/11-JoinPage.jpg | design-source/JoinPage.dc.html |
| JoinPage-Mobile | Join Us · Mobile (first 8000px) | screens/11-JoinPage-Mobile.jpg | design-source/JoinPage-Mobile.dc.html |
| JoinFormStates | Membership form · all states · Desktop | screens/11-JoinFormStates.jpg | design-source/JoinFormStates.dc.html |
| JoinFormStates-Mobile | Membership form · all states · Mobile | screens/11-JoinFormStates-Mobile.jpg | design-source/JoinFormStates-Mobile.dc.html |
| JoinPage-Mobile-Continued | Join Us · Mobile · continued (form + footer) | screens/11-JoinPage-Mobile-Continued.jpg | design-source/JoinPage-Mobile-Continued.dc.html |

## 12 · Sponsors & partners — For Companies page, logo rules & inquiry form · spec 09

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| PartnersPage | For Companies · Desktop | screens/12-PartnersPage.jpg | design-source/PartnersPage.dc.html |
| PartnersPage-Mobile | For Companies · Mobile | screens/12-PartnersPage-Mobile.jpg | design-source/PartnersPage-Mobile.dc.html |
| PartnersStates | Partners · logo rules, empty tier & inquiry form states | screens/12-PartnersStates.jpg | design-source/PartnersStates.dc.html |
| PartnersStates-Mobile | Partnership inquiry · states · Mobile | screens/12-PartnersStates-Mobile.jpg | design-source/PartnersStates-Mobile.dc.html |

## 13 · Contact — page, form states & subject routing · spec 10

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| ContactPage | Contact · Desktop | screens/13-ContactPage.jpg | design-source/ContactPage.dc.html |
| ContactPage-Mobile | Contact · Mobile | screens/13-ContactPage-Mobile.jpg | design-source/ContactPage-Mobile.dc.html |
| ContactStates | Contact form · states & subject menu | screens/13-ContactStates.jpg | design-source/ContactStates.dc.html |
| ContactStates-Mobile | Contact form · states · Mobile | screens/13-ContactStates-Mobile.jpg | design-source/ContactStates-Mobile.dc.html |

## 14 · Admin Panel — shared patterns, desktop first + tablet & mobile · spec 11

| Frame | Shows | Screenshot | Source |
|---|---|---|---|
| AdminLogin | Admin · Sign in · /admin/login | screens/14-AdminLogin.jpg | design-source/AdminLogin.dc.html |
| AdminLoginStates | Admin · Sign-in states (error, forgot password, link sent, 2-step) | screens/14-AdminLoginStates.jpg | design-source/AdminLoginStates.dc.html |
| AdminLogin-Mobile | Admin · Sign in · Mobile | screens/14-AdminLogin-Mobile.jpg | design-source/AdminLogin-Mobile.dc.html |
| AdminDashboard | Admin · Dashboard · Desktop | screens/14-AdminDashboard.jpg | design-source/AdminDashboard.dc.html |
| AdminDashboard-Tablet | Admin · Dashboard · Tablet (icon rail) | screens/14-AdminDashboard-Tablet.jpg | design-source/AdminDashboard-Tablet.dc.html |
| AdminMobileViews | Admin · Mobile (drawer menu, cards, approve bar) | screens/14-AdminMobileViews.jpg | design-source/AdminMobileViews.dc.html |
| AdminEvents | Admin · Events list · filters, bulk actions, pagination | screens/14-AdminEvents.jpg | design-source/AdminEvents.dc.html |
| AdminEvents-Empty | Admin · Events list · No results | screens/14-AdminEvents-Empty.jpg | design-source/AdminEvents-Empty.dc.html |
| AdminEventEdit | Admin · Edit event · all field types | screens/14-AdminEventEdit.jpg | design-source/AdminEventEdit.dc.html |
| AdminEditStates | Admin · Edit form · save bar, validation & toasts | screens/14-AdminEditStates.jpg | design-source/AdminEditStates.dc.html |
| AdminApprovals | Admin · Approval queue · Memories | screens/14-AdminApprovals.jpg | design-source/AdminApprovals.dc.html |
| AdminInbox | Admin · Inbox · read/unread & CSV export | screens/14-AdminInbox.jpg | design-source/AdminInbox.dc.html |
| AdminSettings | Admin · Settings · branding, events, contact & legal, SEO | screens/14-AdminSettings.jpg | design-source/AdminSettings.dc.html |
| AdminUsers | Admin · Users & roles | screens/14-AdminUsers.jpg | design-source/AdminUsers.dc.html |
| AdminDialogs | Admin · Dialogs · delete, reject, unsaved changes, invite | screens/14-AdminDialogs.jpg | design-source/AdminDialogs.dc.html |