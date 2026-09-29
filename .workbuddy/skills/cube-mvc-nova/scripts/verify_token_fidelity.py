# -*- coding: utf-8 -*-
"""Nova token fidelity verifier (read-only).

Compares token (name, value) pairs currently defined in the authoritative
nova-tokens.css against the git HEAD versions of the source CSS files that
tokens were extracted from. Reports every HEAD pair that is missing or has a
different value in the tokens file, plus extras added in the tokens file.

Usage:
  python verify_token_fidelity.py --tokens <nova-tokens.css path> \
      --source <repo-relative css path> [--source <...>] \
      --repo <git repo root>   (repeatable; sources resolve inside their repo)

Notes:
  - Read-only: uses `git show HEAD:<path>`; never touches the working tree.
  - `git show` always emits LF regardless of working-tree CRLF; parsing
    normalizes line endings anyway.
  - Exit codes: 0 = every HEAD token pair is covered (extras listed for
    review); 1 = at least one HEAD pair missing/different.
"""
import argparse
import collections
import re
import subprocess
import sys

PAIR = re.compile(r'(--nv-[a-z0-9-]+)\s*:\s*([^;]+);')


def git_show(repo: str, path: str) -> str:
    out = subprocess.run(
        ['git', '-C', repo, 'show', 'HEAD:' + path],
        capture_output=True, check=True,
    )
    return out.stdout.decode('utf-8')


def pairs(text: str) -> collections.Counter:
    return collections.Counter(
        (m.group(1), m.group(2).strip()) for m in PAIR.finditer(text)
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--tokens', required=True, help='path to nova-tokens.css')
    ap.add_argument('--source', action='append', required=True,
                    help='<repo>::<relative-path> of a HEAD css file tokens came from, e.g. '
                         'G:/repos/NewLife.Cube.Nova::wwwroot/Content/nova/nova-ui.css')
    args = ap.parse_args()

    tok = pairs(open(args.tokens, 'rb').read().decode('utf-8'))

    head = collections.Counter()
    for spec in args.source:
        repo, _, rel = spec.rpartition('::')
        if not repo:
            ap.error('--source must be <repo>::<relative-path>: %r' % spec)
        text = git_show(repo, rel)
        head += pairs(text)
        print('[source] %s::%s -> %d pairs' % (repo, rel, sum(pairs(text).values())))

    missing = head - tok   # in HEAD but missing/different in tokens file
    extras = tok - head    # added/normalized in tokens file

    print('HEAD pairs total: %d unique %d' % (sum(head.values()), len(head)))
    print('MISSING/DIFFERENT in tokens file: %d' % sum(missing.values()))
    for (name, val), cnt in sorted(missing.items()):
        print('   DIFF %s = %s (x%d)' % (name, val, cnt))
    print('EXTRA in tokens file: %d' % sum(extras.values()))
    for (name, val), cnt in sorted(extras.items()):
        print('   EXTRA %s = %s (x%d)' % (name, val, cnt))

    verdict = 'PASS' if not missing else 'FAIL'
    print('VERDICT:', verdict)
    return 0 if not missing else 1


if __name__ == '__main__':
    sys.exit(main())
