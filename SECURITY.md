# Security Policy

## Supported Versions

Only versions `1.1.0` and above have SHA1 (legacy) password hashing.
Direct messages are not encrypted (yet).
Only versions `1.3.3` and above support input validation against scripting.
Only versions `2.1.0` and above have server overload protection.
Only versions `3.2.0` and above have Argon2 password hashing.

> Note that SHA1 is not considered secure anymore, and you should upgrade to version `3.2.0` or above to use Argon2.

| Version         | Supported            |
| --------------- | -------------------- |
| 3.2.0 >         | Argon2 Hashing       |
| 2.1.0 >         | Character Limits     |
| 1.3.3 >         | Input Validation     |
| 1.3.0 >         | No DM encryption     |
| 1.1.0 > 3.2.0   | SHA1 Backend Hashing |
| < 1.1.0         | No security          |

## Reporting Issues

If the issue is minor, then feel free to open an issue.
However, if you feel that the issue is too major, then please email me directly at vishesh.kudva@outlook.com, and I will look into it.
Please remember that this is a hobby project that I made, and security is not my primary concern.
