#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import {
  prefsClearCommand,
  prefsSetCommand,
  prefsShowCommand,
} from "./commands/prefs.js";
import { probeCommand } from "./commands/probe.js";
import { syncCommand } from "./commands/sync.js";
import { getPackageVersion } from "./utils/paths.js";

const program = new Command();

program
  .name("mtsk")
  .description(
    "MetaSkill — Universal AI Project Architect CLI for multi-domain vibecoding and long autonomous workflows."
  )
  .version(getPackageVersion());

program
  .command("init")
  .description("Probe environment, install canonical MetaSkill brain, and sync thin IDE adapters")
  .option("--dir <path>", "Target project directory", process.cwd())
  .option("--persona <mode>", "Target profile: vibecoder or dev")
  .option("--domains <csv>", "Comma-separated domains: web-fullstack,video-audio,db-appsec,custom")
  .option("--agents <csv>", "Comma-separated agents: claude-code,cursor,windsurf,antigravity,codex,cline")
  .option("--autonomy <mode>", "Execution rhythm: guided or autonomous-long")
  .option("--permissions <mode>", "Initial permission tier: read-only, scoped-write, or autonomous-green")
  .option("--lang <lang>", "Adaptive language policy: auto, en, or es")
  .option("-y, --yes", "Non-interactive setup using flags and detected/saved defaults")
  .option("--no-git", "Skip automatic git init in vibecoder mode")
  .option("--dry-run", "Simulate installation and report changes/conflicts without writing any files")
  .option("--force", "Overwrite only MetaSkill-managed fenced blocks when resolving conflicts")
  .option("--save-global", "Persist selected preferences as global defaults for future projects")
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command("probe")
  .description("Deterministically inspect OS, CPU/RAM, GPU/VRAM, IDEs, and installed CLIs")
  .option("--dir <path>", "Target project directory", process.cwd())
  .option("--json", "Output raw ProbeProfile JSON")
  .option("--write", "Write .agents/probe-profile.json in target directory")
  .action(async (options) => {
    await probeCommand(options);
  });

program
  .command("doctor")
  .description("Validate environment readiness, canonical health, adapters, and hardware advisories")
  .option("--dir <path>", "Target project directory", process.cwd())
  .option("--domain <name>", "Check prerequisites for a single domain")
  .option("--json", "Output raw DoctorReport JSON")
  .action(async (options) => {
    await doctorCommand(options);
  });

program
  .command("sync")
  .description("Refresh canonical MetaSkill files and conflict-safely regenerate IDE adapters")
  .option("--dir <path>", "Target project directory", process.cwd())
  .option("--agents <csv>", "Override target coding agents")
  .option("--domains <csv>", "Override active domains")
  .option("--persona <mode>", "Override persona: vibecoder or dev")
  .option("--lang <lang>", "Override language: auto, en, or es")
  .option("--autonomy <mode>", "Override execution rhythm: guided or autonomous-long")
  .option("--permissions <mode>", "Explicitly update permission tier: read-only, scoped-write, autonomous-green")
  .option("--check", "Read-only verification of adapter drift and conflicts without writing files")
  .option("--force", "Update MetaSkill fenced blocks even when modified manually (user text outside fences stays intact)")
  .action(async (options) => {
    await syncCommand(options);
  });

const prefsCmd = program
  .command("prefs")
  .description("Inspect, save, or clear opt-in global MetaSkill preferences");

prefsCmd
  .command("show")
  .description("Show saved global preferences (read-only)")
  .option("--json", "Output JSON")
  .action(async (options) => {
    await prefsShowCommand(options);
  });

prefsCmd
  .command("set")
  .description("Save opt-in global defaults for future projects")
  .option("--persona <mode>", "Default persona: vibecoder or dev")
  .option("--lang <lang>", "Default language: auto, en, or es")
  .option("--domains <csv>", "Default domains CSV")
  .option("--agents <csv>", "Default coding agents CSV")
  .option("--autonomy <mode>", "Default execution rhythm: guided or autonomous-long")
  .option("--permissions <mode>", "Default permission tier: read-only, scoped-write, autonomous-green")
  .action(async (options) => {
    await prefsSetCommand(options);
  });

prefsCmd
  .command("clear")
  .description("Delete saved global preferences")
  .action(async () => {
    await prefsClearCommand();
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(pc.red(`Error: ${message}`));
  process.exit(1);
});
