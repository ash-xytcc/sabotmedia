# Local robot reader notices

Sabot's public read-aloud feature is intentionally local and deterministic. It does not call a speech API, neural text-to-speech model, or large language model.

## Klattsch synthesis code and phoneme data

The formant synthesis primitives and English Klatt 1980 phoneme-bank values in `vendor/` are adapted from **Klattsch** by Tony Gies.

MIT License

Copyright (c) 2026 Tony Gies

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Upstream: https://github.com/tgies/klattsch

## NRL / Elovitz text-to-phoneme rules

The deterministic English letter-to-sound rules are based on the 1976 Naval Research Laboratory / Elovitz algorithm described in NRL Report 7948, "Automatic translation of English text to phonetics by means of letter-to-sound rules." Rule data was adapted from Greg Kennedy's `p5-NRL-TextToPhoneme` implementation, released under the Unlicense / into the public domain.

Upstream: https://github.com/greg-kennedy/p5-NRL-TextToPhoneme
