# Demo sandbox

Open `/demo/` or select **Try it with sample data** on the home page. The demo
starts with three named sample saves: Golden Sun, Chrono Trigger, and a save that
needs review. **Review portable bundle** changes only the demo state.

The site demo stores state under `demo:retro-save-portability:sample`. The
desktop app’s **Load sample project** action uses
`demo:retro-save-portability:desktop`. Neither path reads a folder or writes a
real bundle, license, journal, or non-demo local-storage key. **Reset demo**
restarts the prepared sample. **Start for real** removes demo state and returns
to folder selection or the desktop download.
