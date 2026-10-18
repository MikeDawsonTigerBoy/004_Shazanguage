# 004 Shazanguage

Shazam for languages. Tap to listen to someone speaking, find out which language it is, and learn how to say hello in it.

> **Draft for review.** Lines tagged *(proposed)* are Claude's suggestions, not yet agreed. Sections 1–3 were inferred from the existing code and need Mike to confirm them. Section 10 lists the questions to settle before the new version.

## Status

There is a working prototype, called "Sawubona", in `index.html`, `app.js` and `styles.css`:
- It records 5 seconds of audio and sends it to a local server, which identifies the language.
- It then shows a greeting and a phrasebook for that language.
- A demo mode picks a language at random.

A new version is being planned.

## 1. Problem statement

*(inferred)* In a multilingual place like South Africa, which has 12 official languages, you often hear a language without knowing which one it is. That means missing the chance to greet someone in their own language, a small act of respect that changes the interaction.

## 2. Target audience

*(inferred)*
- Residents and visitors in multilingual cities who want to connect across languages.
- Possibly language learners.

## 3. Value proposition

Go from "what language is that?" to saying hello in it, in about 10 seconds.

## 4. Core functionality

- Tap to listen for 5 seconds.
- Identify the language, with a confidence level.
- Show the greeting, how to pronounce it and a few key phrases.
- Browse every language's phrasebook.

## 5. Key user journeys

1. **Identify:** you hear a conversation, tap, see "isiXhosa" with how to say "Molo", and greet the speaker.
2. **Browse:** you open the phrasebook before visiting somewhere new.

## 6. Non-goals

*(proposed)*
- Not a translator.
- No full lessons.
- No storing of recordings.

## 7. Feasibility

- The current language model is about 3.8 GB and runs on a Python server, so it can't run inside a phone app.
- The options are:
  - Host the model on a server, which costs money and adds a delay.
  - Use a smaller model on the phone, which is less accurate.
- `server.py` is referred to in the code but isn't in this repo.

## 8. Assumptions and risks

- **Accuracy:** closely related languages, such as isiZulu and isiXhosa or Sesotho and Setswana, are hard to tell apart from 5 seconds of audio. A wrong guess turns a respectful greeting into an awkward one.
- **Consent:** recording strangers without asking raises privacy and courtesy questions.
- **Frequency:** how often does this moment happen to one person? It may suit a single use, not daily use.

## 9. Success metrics

*(proposed)*
- Correct identification rate on test clips of South African languages.
- Time from tap to greeting.
- Greetings actually attempted (self-reported).

## 10. Open questions and challenges

1. **Mike to confirm:** are the problem and audience above right? What's the origin story?
2. **What changes in the new version?** Is it a phone app, a different model or a new focus?
3. **Is it about learning or about respect?** If it's respect, the phrasebook and pronunciation matter more than identification.
   - People could pick the language themselves, which would make the 3.8 GB model unnecessary.
4. **When it's unsure, what does it show?** It should say "probably isiZulu or isiXhosa" rather than guess confidently.

## 11. Tech approach

- **Now:** plain HTML/JS front end plus a Python server with a language-identification model.
- **Planned:** Expo, the portfolio standard. This depends on where the model runs.

## 12. Roadmap

- **v0 (done):** web prototype with demo mode.
- **v1:** to be defined.

## Running it

The front end needs `server.py`, which isn't in this repo yet.
