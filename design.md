# Dexus Mobile Product Design

## Product Direction

Dexus is a private AI workspace for capturing unstructured thoughts and turning them into dependable, usable actions. The mobile product is designed for quick one-handed capture first, then calm review and execution. It should feel precise, private, and capable rather than playful or overly decorative. The defining interaction is **Brain Dump → AI understanding → organised life**.

The layout assumes a portrait 9:16 phone, with primary controls in the lower half of the display, generous safe-area spacing, and native iOS interaction patterns. Navigation uses a restrained bottom tab bar and context screens are pushed or presented in sheets. The capture action remains available from every primary location.

## Screen List

| Screen | Primary content and functionality |
|---|---|
| Welcome and account access | Brand introduction, secure sign-in and account creation, concise explanation of the value proposition. |
| Home | Daily overview, open tasks, progress toward a current goal, recent knowledge, and suggested next actions. |
| Brain Dump | A focused natural-language composer; users enter a thought, submit it for AI processing, review structured results, and save or edit them. |
| Tasks | Filterable task list grouped by urgency and date, task completion, task editing, and task details. |
| Knowledge | Searchable notes and saved knowledge items with tags, source context, and detail view. |
| Goals | Active goal cards with progress, target dates, linked work, and goal detail editing. |
| People and follow-ups | Contact context, relationship notes, and follow-up actions due soon. |
| Timeline | Chronological history of captures, tasks, knowledge, goals, and completed work. |
| Insights | AI-generated weekly focus summary, workload signals, knowledge patterns, and suggested actions. |
| Search | Unified query of tasks, notes, knowledge, people, goals, and timeline items. |
| Settings and profile | Profile, appearance, notifications, privacy, data management, and sign-out. |

## Primary Navigation

The tab bar contains **Home**, **Tasks**, a visually distinctive central **Capture** action, **Knowledge**, and **More**. More reveals Goals, People, Timeline, Insights, Search, and Settings in a native list. This preserves reachability for core capture and review actions without crowding the tab bar. Each screen uses a native-style large title where appropriate, compact navigation titles in detail contexts, minimum 44pt touch targets, and clear text labels alongside unfamiliar icons.

## Key User Flows

| User goal | Flow |
|---|---|
| Capture an unstructured thought | Home or any tab → tap Capture → write or paste brain dump → submit → processing state → review AI understanding → edit if needed → confirm saved items → return to Home or relevant detail. |
| Complete a task | Tasks → select task → optionally edit → mark complete → receive haptic success feedback → timeline updates and dashboard refreshes. |
| Retrieve a past idea | Search or Knowledge → type semantic/natural-language query → results grouped by type → select item → inspect, edit, or take linked action. |
| Follow up with a person | People → select person → view context and outstanding follow-ups → create or complete follow-up → timeline records the update. |
| Reflect and plan | Home → Insights → inspect focus summary and overdue signals → tap suggested action → land on the relevant task, goal, or Brain Dump screen. |
| Manage the account | More → Settings → profile or preferences → save changes → clear success feedback; sensitive actions are confirmed in a modal. |

## Interaction Principles

The capture composer opens keyboard-first, supports multiline input, and has an explicit submit button with a disabled/loading state to prevent duplicate requests. AI results are never silently committed: the review sheet makes each detected item clear, editable, removable, and confirmable. Empty states explain the next useful action, while loading, error, retry, and offline-friendly feedback preserve user confidence.

Completed actions use gentle haptic feedback, plus a brief confirmation. Lists use efficient virtualised rendering. Destructive actions require confirmation. Analytics and personal history never appear outside the signed-in user’s account.

## Visual System

| Element | Choice |
|---|---|
| Brand primary | **Deep indigo #3F3A9B**, conveying intelligence and concentration. |
| Brand accent | **Electric violet #7557E8**, reserved for capture, focus, and active elements. |
| Canvas | **Porcelain #F7F7FB** in light mode and **Ink #12121A** in dark mode. |
| Surfaces | **White #FFFFFF** and **Graphite #1D1D29**, with subtle borders rather than heavy shadows. |
| Text | **Midnight #181727** for headings and **Slate #6C6A7B** for supporting copy. |
| Semantic colors | Success **#218E65**, warning **#C88618**, and error **#C23B53**. |
| Typography | System San Francisco on iOS and the platform system font elsewhere, using high-contrast hierarchy and readable line height. |

Cards are used sparingly to group meaningful content, with 16–20pt corner radii and 1px low-contrast borders. The signature Dexus motif is a simple connected-node mark and thin orbital linework used only in the icon, empty states, and subtle branded moments. Gradients and translucent effects are avoided except for a minimal accent glow within the capture action.

## Accessibility and Responsiveness

The interface respects Dynamic Type, maintains contrast suitable for light and dark themes, labels all icon controls, and avoids conveying status by colour alone. Controls remain comfortably tappable, text is never clipped, and the capture flow remains usable with a software keyboard visible. The app supports adaptive widths while optimizing all decisions for portrait phone use.
