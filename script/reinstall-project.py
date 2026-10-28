"""Reinstall checkout dependencies without depending on node_modules itself."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time


def reinstall(root, backup):
    package = json.loads((root / 'package.json').read_text())
    workspaces = package['workspaces']
    patterns = workspaces['packages'] if isinstance(workspaces, dict) else workspaces
    directories = [root / 'node_modules'] + [
        p / 'node_modules' for pattern in patterns for p in root.glob(pattern) if p.is_dir()
    ]
    original = {p for p in directories if p.exists() or p.is_symlink()}
    moved = []
    backup.mkdir(parents=True, exist_ok=False)
    try:
        for directory in directories:
            if not directory.exists() and not directory.is_symlink():
                continue
            relative = directory.relative_to(root)
            destination = backup / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            directory.rename(destination)
            moved.append(relative)
            (backup / 'moved.json').write_text(json.dumps([str(p) for p in moved]))
        bun = str(Path.home() / '.bun/bin/bun')
        if not Path(bun).is_file():
            bun = shutil.which('bun')
        if not bun:
            raise RuntimeError('No se encontró Bun')
        subprocess.run([bun, 'install', '--frozen-lockfile'], cwd=root, check=True, timeout=1200)
        electron = root / 'packages/desktop/node_modules/.bin/install-electron'
        subprocess.run(
            ['node', str(electron)], cwd=root,
            env={**os.environ, 'electron_config_cache': str(Path.home() / '.cache/electron')},
            check=True, timeout=1200,
        )
        subprocess.run([bun, 'run', 'check'], cwd=root, check=True, timeout=1200)
    except BaseException:
        # Restore the entire original tree, including workspace links, on any failed stage.
        for directory in directories:
            if directory in original and directory.relative_to(root) not in moved:
                continue
            if directory.is_symlink():
                directory.unlink()
            elif directory.exists():
                shutil.rmtree(directory)
        for relative in moved:
            destination = root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            (backup / relative).rename(destination)
        shutil.rmtree(backup)
        raise
    shutil.rmtree(backup)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--wait-pid', type=int, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    profile = Path.home() / '.opencode-projects' / hashlib.sha256(str(root).encode()).hexdigest()[:16]
    maintenance = profile / 'maintenance'
    maintenance.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (maintenance / 'lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        message = 'Reinstalación completada. Se conservaron el código y los datos.'
        try:
            deadline = time.monotonic() + 60
            while Path('/proc', str(args.wait_pid)).exists():
                if time.monotonic() > deadline:
                    raise RuntimeError('La aplicación no se cerró; no se cambiaron dependencias')
                time.sleep(0.2)
            backup = maintenance / 'dependencies-backup'
            if backup.exists():
                raise RuntimeError('Hay un respaldo pendiente de recuperar; no se sobrescribe')
            # The project launcher selects the private service; never invoke the official CLI.
            subprocess.run([str(root / 'script/openc'), 'service', 'stop'], cwd=root, check=True, timeout=60)
            reinstall(root, backup)
        except Exception as error:
            message = 'La reinstalación no se completó. Consulta maintenance/reinstall.log para ver el resultado de la recuperación.'
            print(message, repr(error), flush=True)
        try:
            subprocess.run([str(root / 'script/openc'), 'service', 'start'], cwd=root, check=True, timeout=60)
        except Exception as error:
            message = 'No se pudo iniciar el servidor; la app intentará conectarlo de nuevo. Consulta maintenance/reinstall.log.'
            print(message, repr(error), flush=True)
        log = (profile / 'maintenance/reinstall.log').open('a')
        subprocess.Popen([str(root / 'script/openc-desktop')], cwd=root, stdout=log, stderr=log, start_new_session=True)
        if shutil.which('notify-send'):
            subprocess.run(['notify-send', 'OpenVoid cracked version', message], check=False)
        print(message, flush=True)


if __name__ == '__main__':
    main()
