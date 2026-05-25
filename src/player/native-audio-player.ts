import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class NativeAudioPlayer {
  private windowsChild: ChildProcessWithoutNullStreams | undefined;
  private playbackChild: ChildProcess | undefined;
  private playbackFile: string | undefined;
  private paused = false;

  async open(url: string): Promise<void> {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Refusing to play non-http audio URL.");
    }

    if (process.platform === "win32") {
      await this.ensureWindowsChild();
      this.send(`open ${Buffer.from(url, "utf8").toString("base64")}`);
      return;
    }

    await this.openWithProcessPlayer(url);
  }

  async play(): Promise<void> {
    if (process.platform === "win32") {
      await this.ensureWindowsChild();
      this.send("play");
      return;
    }

    if (this.playbackChild && this.paused) {
      this.playbackChild.kill("SIGCONT");
      this.paused = false;
    }
  }

  async pause(): Promise<void> {
    if (process.platform === "win32") {
      await this.ensureWindowsChild();
      this.send("pause");
      return;
    }

    if (this.playbackChild && !this.paused) {
      this.playbackChild.kill("SIGSTOP");
      this.paused = true;
    }
  }

  async setVolume(volume: number): Promise<void> {
    const clamped = Math.min(Math.max(volume, 0), 100);
    if (process.platform === "win32") {
      await this.ensureWindowsChild();
      this.send(`volume ${clamped}`);
      return;
    }
  }

  async destroy(): Promise<void> {
    if (this.windowsChild) {
      this.send("stop");
      this.windowsChild.kill();
      this.windowsChild = undefined;
    }

    if (this.playbackChild) {
      this.playbackChild.kill();
      this.playbackChild = undefined;
    }

    await this.cleanupPlaybackFile();
    this.paused = false;
  }

  private async ensureWindowsChild(): Promise<void> {
    if (this.windowsChild && !this.windowsChild.killed) return;

    const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
while (($line = [Console]::In.ReadLine()) -ne $null) {
  if ($line.StartsWith('open ')) {
    $payload = $line.Substring(5)
    $url = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload))
    $player.Stop()
    $player.Open([Uri]$url)
    Start-Sleep -Milliseconds 200
    $player.Play()
  } elseif ($line -eq 'play') {
    $player.Play()
  } elseif ($line -eq 'pause') {
    $player.Pause()
  } elseif ($line.StartsWith('volume ')) {
    $value = [double]$line.Substring(7)
    $player.Volume = [Math]::Min([Math]::Max($value / 100.0, 0.0), 1.0)
  } elseif ($line -eq 'stop') {
    $player.Stop()
    break
  }
}
$player.Close()
`;

    this.windowsChild = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: "pipe" });
    this.windowsChild.stderr.on("data", (chunk) => {
      const message = String(chunk).trim();
      if (message) process.stderr.write(`[player] ${message}\n`);
    });
  }

  private async openWithProcessPlayer(url: string): Promise<void> {
    await this.stopProcessPlayer();
    const file = await downloadToTempFile(url);
    const command = process.platform === "darwin" ? { bin: "afplay", args: [file] } : await linuxPlayerCommand(file);

    this.playbackFile = file;
    this.playbackChild = spawn(command.bin, command.args, { stdio: "ignore" });
    this.paused = false;
    this.playbackChild.on("exit", () => {
      this.playbackChild = undefined;
      this.paused = false;
    });
    this.playbackChild.on("error", (error) => {
      process.stderr.write(`[player] ${error.message}\n`);
    });
  }

  private async stopProcessPlayer(): Promise<void> {
    if (this.playbackChild) {
      this.playbackChild.kill();
      this.playbackChild = undefined;
    }
    await this.cleanupPlaybackFile();
    this.paused = false;
  }

  private async cleanupPlaybackFile(): Promise<void> {
    if (!this.playbackFile) return;
    await rm(this.playbackFile, { force: true });
    this.playbackFile = undefined;
  }

  private send(command: string): void {
    if (!this.windowsChild || this.windowsChild.killed) {
      throw new Error("Audio player is not running.");
    }
    this.windowsChild.stdin.write(`${command}\n`);
  }
}

async function downloadToTempFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Audio download failed: HTTP ${response.status}`);
  }

  const directory = join(tmpdir(), "coding-vibe-player");
  await mkdir(directory, { recursive: true });
  const file = join(directory, `netease-${Date.now()}.mp3`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

async function linuxPlayerCommand(file: string): Promise<{ bin: string; args: string[] }> {
  const candidates = [
    { bin: "ffplay", args: ["-nodisp", "-autoexit", "-loglevel", "quiet", file] },
    { bin: "mpg123", args: ["-q", file] },
    { bin: "mpv", args: ["--no-video", "--really-quiet", file] }
  ];

  for (const candidate of candidates) {
    if (await commandExists(candidate.bin)) return candidate;
  }

  throw new Error("No Linux audio player found. Install ffplay, mpg123, or mpv for dev --netease playback.");
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("which", [command], { stdio: "ignore" });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}
