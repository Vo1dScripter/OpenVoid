import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('reinstall_project', Path(__file__).with_name('reinstall-project.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ReinstallTests(unittest.TestCase):
    def test_failed_install_restores_workspace_dependencies_and_preserves_data(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'project'
            root.mkdir()
            (root / 'package.json').write_text('{"workspaces":{"packages":["packages/*"]}}')
            for relative in ['node_modules', 'packages/desktop/node_modules']:
                directory = root / relative
                directory.mkdir(parents=True)
                (directory / 'original').write_text(relative)
            (root / 'history.db').write_text('history')
            def fail(*args, **kwargs):
                (root / 'node_modules').mkdir()
                (root / 'node_modules/partial-install').write_text('incomplete')
                raise subprocess.CalledProcessError(1, args[0])
            with patch.object(worker.subprocess, 'run', side_effect=fail):
                with self.assertRaises(subprocess.CalledProcessError):
                    worker.reinstall(root, Path(temporary) / 'backup')
            for relative in ['node_modules', 'packages/desktop/node_modules']:
                self.assertEqual((root / relative / 'original').read_text(), relative)
            self.assertFalse((root / 'node_modules/partial-install').exists())
            self.assertEqual((root / 'history.db').read_text(), 'history')

    def test_success_removes_backup_and_preserves_source(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'project'
            root.mkdir()
            (root / 'package.json').write_text('{"workspaces":[]}')
            (root / 'source.ts').write_text('user changes')
            (root / 'node_modules').mkdir()
            (root / 'node_modules/old').write_text('old')
            backup = Path(temporary) / 'backup'
            def install(*args, **kwargs):
                directory = root / 'node_modules'
                directory.mkdir(exist_ok=True)
                (directory / 'new').write_text('new')
            with patch.object(worker.subprocess, 'run', side_effect=install) as commands:
                worker.reinstall(root, backup)
            self.assertEqual(commands.call_count, 3)
            self.assertTrue((root / 'node_modules/new').exists())
            self.assertFalse((root / 'node_modules/old').exists())
            self.assertFalse(backup.exists())
            self.assertEqual((root / 'source.ts').read_text(), 'user changes')

    def test_verification_failure_restores_original_tree(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'project'
            root.mkdir()
            (root / 'package.json').write_text('{"workspaces":[]}')
            (root / 'node_modules').mkdir()
            (root / 'node_modules/original').write_text('original')
            with patch.object(worker.subprocess, 'run', side_effect=[None, None, subprocess.CalledProcessError(1, 'check')]):
                with self.assertRaises(subprocess.CalledProcessError):
                    worker.reinstall(root, Path(temporary) / 'backup')
            self.assertEqual((root / 'node_modules/original').read_text(), 'original')


if __name__ == '__main__':
    unittest.main()
