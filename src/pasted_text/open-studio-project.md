Project Introduction

Open Studio Australia is a nationwide digital platform designed to connect visitors with artists, studios, and creative events across the country. The project reimagines the traditional Open Studios experience by offering a centralised, mobile-first application where people can discover local creative communities, explore studios, attend workshops, and browse curated catalogues.

The platform was developed with a strong focus on user experience and accessibility, ensuring that visitors, artists, studio owners, and licensees all have tailored tools to meet their unique needs. My role in this project included concept development, user experience design, object-oriented UX (OOUX) structuring, and interface prototyping.

Key Elements of the Project

User Roles

Multiple access levels were defined, including Visitors, Logged-in Users, Artists, Studio Owner, Licensees, and a Super Admin. Each role was mapped with priorities and goals to ensure a clear, role-based experience.

1. Public (Not Logged In)
Primary goal: Discover and explore artists, studios and events

Top Priorities:

Search and browse events, artists and studios

View artist profiles with images and bios

Filter by date, location, medium, and accessibility

View event details (time, location, artists involved)

Navigate via map

Learn about the Open Studios initiative

2. Logged-In User (Art Lover)
Primary goal: Same as Public + Save favourites to assist in planning visits

Top Priorities:

All Public access features

Save or favourite artists/events

Receive updates or notifications (if implemented later)

Personalise event planner (map with studio locations)

3. Artist (Logged In & Approved)
Primary goal: Showcase their work and join events

Top Priorities:

Create and manage artist profile  (bio, artwork images, contact info, location, availability)

Apply to or request to join events

View event invitations from licensees

Track upcoming events they’re participating in

View how their profile appears to the public

Update availability and profile info

4. Studio Owner (Artists who owns a studio)
Primary Goal: To promote their studio and manage its participation in events while showcasing the artists associated with the space.

Top Priorities:

Edit and manage studio profile

Update address, description, studio type, and accessibility notes

Upload studio cover image and gallery

Manage artists linked to the studio

Approve/Reject artists joining the studio

View artist profiles and availability

Participate in events

Apply for the studio to be part of an event

Set studio availability and opening hours for events

View which events the studio is involved in

4. Licensee (Logged In)
Primary goal: Manage regional events and participating studios/artists

Top Priorities:

Review and approve/reject studios/ artist applications

Request more info from studios/ artists

Create and manage regional events

Invite specific artists to join events

View artist availability

Access region-specific map and listings

Edit content on catalogue page

Create filters and tags

Communicate with Super Admin for support

5. Super Admin
Primary goal: Oversee entire platform, support licensees

Top Priorities:

View all users platform-wide

Assist licensees with artist/studios/event issues

Override approvals if needed

Add/edit licensee accounts

Monitor platform activity and flag inconsistencies

Manage global settings or featured content

Create (default) filters and tags

Edit content on catalogue page

Object-Oriented UX (OOUX) Design

I have used the OOUX methodology and the platform was structured around key objects such as Artworks, Events, Workshops, Studios, Catalogues, Applications, Blogs, and User Profiles. Each object was broken down into core content, metadata, nested objects, and clear calls-to-action (CTAs).

Database Structure

The database structure is the backbone of the platform, supporting everything from user profiles to event management and catalogue creation. During development, this was treated as a work in progress, evolving alongside new features and user needs. Designing a scalable, well-structured database was critical to ensuring that the platform could grow sustainably, maintain performance, and keep data consistent across all roles — from super admins to artists and art lovers.

User Dashboard Design

Custom dashboards were created for the different user types and each user type has its own specific features.

Art lovers Dashboard- Mobile view

This user type can view all content. They have the option to follow artists and studios. This helps them stay up to date with new artworks that artists produce or events studios join.

Designing the Artist Profile

During my research, I found that artists need a space to present themselves professionally. This space should also make it easy for organizers and audiences to explore their work. The Artist Profile was designed as a digital portfolio within the platform. It balances personal storytelling with structured data. This data can be used for events and catalogues.

From a UX perspective, the challenge was to create a profile that felt human and expressive. It also needed to support the administrative needs of licensees and super admins. The solution was a profile that combines:

Personal identity – biography, profile image, and contact details.

Professional portfolio – artworks, media uploads, artwork referencing.

Event visibility – a history of past and upcoming events, automatically linked to the artist.

Giving artists the controls to upload their own artworks and update their profiles ensures consistency across the platform. This is done within a set structure. It not only improved the user experience for artists, but also reduced the workload for administrators managing events and catalogues.

Artists onboarding flow - Mobile

The onboarding journey for artists was designed to make them feel welcomed, supported, and empowered to showcase their work from the very beginning. Since many artists are not tech specialists, the process needed to be simple, intuitive, and encouraging.

The process begins with an Expression of Interest (EOI) submission, where artists provide an initial set of five artworks. This serves two purposes:

It allows the platform to verify suitability of the artist.

The information and artworks submitted are saved directly into the system, forming the foundation of the artist’s profile.

After the EOI is approved, artists can login and continue to set up their profile:

Complete their profile with a biography, profile image, and contact details.

Expand their portfolio by uploading additional artworks or media.

Select art mediums and accessibility options, ensuring consistent categorisation across the platform.

Link themselves to upcoming events, making their participation visible to organisers and audiences.

This onboarding flow reduces friction while reinforcing the platform’s purpose: giving artists a professional digital presence and connecting them directly to opportunities within the arts community.

https://videopress.com/v/NteWdxNM?resizeToParent=true&cover=true&muted=true&persistVolume=false&posterUrl=https%3A%2F%2Fjaiboekhoutnl.wordpress.com%2Fwp-content%2Fuploads%2F2025%2F09%2Fscreenshot-2025-09-10-at-15.10.55.png&preloadContent=metadata&useAverageColor=true

Artists Dashboard - Desktop view

Events

An artist has two ways of joining an event. They can get invited by the licensee. Alternatively, they can request to join an event by registering.

The first row of cards is showing the events the artist is attending. The second row is events the licensee has requested them to join. The next row contains events they might be interested in joining. Finally, the last row shows the event history, which included all the events the artist was part of. 

Applications

All types of applications can be found under the Applications tab. When an artist first joins the platform they have to submit an Expression of Interest (EOI). This EOI needs to be approved by the licensee. After approval, the artist will have full access to their profile. The profile will be hidden from the public until approval. Artists can check the status and update applications if needed.

Activity overview

Another main function an artist has is adding activities to events. The artist will first need to submit an EOI to join an event. Once the EOI is approved, they can submit an activity.

Add new activity

Activities can be used to promote their studio. I have added the functionality for artists to collaborate during an event. Hosting an activity alone can be overwhelming, time-consuming, and intimidating, especially for emerging artists. By enabling collaboration, the platform helps reduce this pressure and individual artists, allowing artists to share responsibilities, combine their strengths, and create richer experiences for audiences.

Designing the Licensee Profile

The Licensee Dashboard was designed as the central control hub for licensees, giving them all the tools they need to manage their community, events, and content in one place. Instead of navigating multiple disconnected systems, licensees can efficiently oversee their responsibilities from a single, intuitive interface.

Key functions of the dashboard include:

Applications management – reviewing and approving new artist or studio applications.

Artist & studio search – discovering and connecting with registered members.

Event management – setting up and organising events with ease.

Catalogue creation – generating digital and print-ready catalogues for events.

Content publishing – writing blog posts and updating public-facing page content.

Account management – keeping personal and organisational details up to date.

The main purpose of this dashboard is to empower licensees with autonomy and efficiency: it reduces administrative complexity, supports consistent communication with artists and studios, and ensures that events and content remain engaging and professional.

Licensees Dashboard- Desktop view

Applications

The Applications page was designed with filters at the top, enabling licensees to quickly sort by status and type. This function reduces time spent on manual review and making the application process more efficient.

View Applications

Licensees can easily review application details and take action. Whether they are approving, requesting updates, or rejecting an application. It can all be done within a single streamlined workflow.

Search Artists

The Artist Search page was designed to help licensees quickly find and manage artists within the platform. To support different user needs, the page includes flexible search and sorting options: licensees can search directly by name or sort results by the number of events an artist has participated in or by their follower count.

Once an artist is selected, licensees gain full visibility of the artist’s profile content. This access not only supports discovery but also allows licensees to assist artists with keeping their profiles accurate and up to date, ensuring a consistent and professional presence across the platform.

Events 

The Events tab was designed as the licensee’s main tool for planning and managing events from start to finish. From this central space, licensees can:

Create new events with all essential details.

Update existing events to keep information accurate and relevant.

Invite artists to participate, ensuring the right talent is showcased.

By consolidating these tasks into one streamlined interface, the Events tab reduces administrative complexity and makes it easier for licensees to deliver well-organised, engaging events.

Catalogue

One of the most impactful features of this project was the catalogue creation tool. Through our research, we discovered that licensees and super admins needed a simple way to showcase event details in a polished, shareable format.

The catalogue tool was designed to give them complete flexibility: they could quickly generate catalogues from existing event data, upload a custom cover page, include advertisements, add a thank-you page, and highlight participating artists. The tool produces both a digital catalogue for online use and a print-ready PDF version, making it easy to share across platforms and distribute at events.

This streamlined process replaced what had previously been a manual, time-consuming task, ensuring that every event could be presented professionally and consistently.

Designing the Super Admin Profile

The Super Admin Profile
The Super Admin Profile was designed to provide platform-wide oversight and control. Unlike licensees, who focus on managing their own community and events, the super admin role ensures that the entire system runs smoothly and consistently. The Super Admin has all the functionalities the Licensee has and more.

Key responsibilities within the Super Admin Profile include:

User management – overseeing licensees, artists, and studios across the platform.

Onboarding licensees – adding new licensees to the platform and ensuring they are set up for success.

Default settings – configuring and managing default functions to maintain consistency across all licensees.

Content governance – monitoring and approving updates to ensure quality and accuracy.

Event oversight – tracking events at a global level, with the ability to step in if support is needed.

Platform settings – managing system-wide configurations, permissions, and policies.

From a UX perspective, the Super Admin Profile balances high-level control with ease of use, enabling super admins to act as both facilitators and guardians of the platform’s overall quality.

Super Admin Dashboard - Desktop view

Licensee management

A core responsibility of the Super Admin is to manage licensees across the platform. To support this, they were given the ability to add new licensees, update existing details, and remove licensees when necessary. This functionality ensures that the platform can grow sustainably, remain up to date, and maintain quality standards as new communities are onboarded and older ones are retired.

Licensee selector feature

To streamline platform-wide management, the Super Admin was given access to all the same functions available to a licensee. The key difference is the addition of a dropdown selector, which allows them to switch between licensees and view or update their content without leaving the dashboard. This design choice ensures consistency across roles while giving super admins the flexibility to manage multiple communities efficiently.

Settings 

Within their settings menu, the Super Admin has the ability to define default accessibility options and art mediums for the platform. This ensures that licensees and artists work from a consistent, standardised set of options when creating profiles, events, or catalogues.

To maintain accuracy, super admins can also remove typos or delete incorrect entries that may have been added over time. This feature helps safeguard the platform’s data quality, reduces confusion for users, and ensures that accessibility and medium choices remain clear and professional.

https://videopress.com/v/Zo0lI6OS?resizeToParent=true&cover=true&muted=true&persistVolume=false&preloadContent=metadata&useAverageColor=true

Final Reflections on the project design phase 

This project was more than just a platform build, it was an opportunity to bridge the gap between artists, art lovers, and administrators through thoughtful design and functionality. By focusing on user needs at every stage, I was able to create tools that not only simplify complex processes but also empower users to connect, collaborate, and grow within the arts community.

From designing intuitive dashboards to building features like catalogue creation, artist profiles, and collaborative activities, each decision was driven by a commitment to usability, scalability, and inclusivity.

The result is a platform that feels both professional and human, supporting creativity while ensuring smooth operations behind the scenes. For me, this project reinforced the value of user-centered design and the impact it can have when technology truly serves its community.

Iterations made after testing

The licensees and super admin were missing a centrelised location to update content.
I've redesigned the settings page to include a tab menu at the top with the different pages they can update. Each section has specific features relevant to the page.

To improve content curation, I introduced a “Highlighted Artists” function that lets admins manually pin and reorder up to four featured artists. The remaining slots are filled through dynamic sorting, balancing editorial control with automated updates.

https://videopress.com/v/WGFANA1a?resizeToParent=true&cover=true&muted=true&persistVolume=false&posterUrl=https%3A%2F%2Fjaiboekhoutnl.wordpress.com%2Fwp-content%2Fuploads%2F2025%2F09%2Fopen_studio_settings_homepage_highlighted_artists-.png&preloadContent=metadata&useAverageColor=true

Add new event function

To reduce admin friction, I designed and implemented an “Add Event” admin workflow with smart defaults and flexible configuration options. Admins can set default start and end times with date-specific overrides, assign locations via address or geolocation pin, or create regional events that dynamically pull studio locations from artist applications. Artist invitations are integrated directly into the creation flow to support early promotion and engagement.

https://videopress.com/v/R2ehKhtN?resizeToParent=true&cover=true&muted=true&persistVolume=false&posterUrl=https%3A%2F%2Fjaiboekhoutnl.wordpress.com%2Fwp-content%2Fuploads%2F2025%2F09%2Fscreenshot-2026-02-11-at-16.38.16.png&preloadContent=metadata&useAverageColor=true