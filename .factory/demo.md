# Demo sandbox

Open `/demo/` or click **Try it with sample data** on the landing page. The demo
starts with three named sample saves: Golden Sun, Chrono Trigger, and an unknown
format that needs review. **Review portable bundle** changes only the demo state.

The site demo stores state under `demo:retro-save-portability:sample`. The
desktop app’s **Load sample project** path uses
`demo:retro-save-portability:desktop`. Neither path reads a folder or writes a
real bundle, license, journal, or non-demo local-storage key. **Reset demo**
restarts the prepared sample; **Start for real** discards the desktop sample and
returns to folder selection.
