// Documentation-review corrections for the supplemental NoBlogs/WordPress path.
// These are applied at publication time so older stored pathway snapshots receive
// current safety/accuracy notes without rewriting private editorial state.
const REVIEWED = new Set(['blog-server','blog-selfhost','blog-backup','blog-domain','blog-finish'])

const replace = (body, from, to) => body.includes(from) ? body.replace(from, to) : body

function reviewSelfHost(body) {
  body = replace(
    body,
    'Run `sudo env MYSQL_HISTFILE=/dev/null mariadb` to open the database prompt without writing this session to a SQL history file. At that prompt enter the following statements one at a time, replacing REPLACE_WITH_UNIQUE_PASSWORD before entering it:',
    'Run `sudo env MYSQL_HISTFILE=/dev/null mariadb` to open the database prompt without writing this session to a SQL history file. If that does not open the MariaDB administrative prompt on the image you actually received, stop and use that image/provider’s documented local database-administration method rather than changing database authentication at random. At the prompt enter the following statements one at a time, replacing REPLACE_WITH_UNIQUE_PASSWORD before entering it:',
  )
  body = replace(
    body,
    'Run `sudo a2enmod rewrite`, then `sudo a2ensite blog`, then `sudo apache2ctl configtest`.',
    'Run `sudo a2enmod rewrite`, then `sudo a2ensite blog`. If the stock `000-default` site is still enabled and you do not need it for anything else on this disposable machine, disable it with `sudo a2dissite 000-default` so unmatched requests do not fall into a second default site. Then run `sudo apache2ctl configtest`.',
  )
  body = replace(
    body,
    '`sudo apt upgrade`\n`sudo apt install apache2 mariadb-server libapache2-mod-php php-mysql php-xml php-curl php-gd php-mbstring php-zip php-intl curl unzip certbot python3-certbot-apache`',
    '`sudo apt upgrade`\nIf the upgrade reports that a reboot is required, reboot the disposable server and reconnect before continuing. Do not begin an application install while the machine is half-updated.\n\n`sudo apt install apache2 mariadb-server libapache2-mod-php php-mysql php-xml php-curl php-gd php-mbstring php-zip php-intl curl unzip`',
  )
  body = replace(
    body,
    'Check versions with `php -v`, `mariadb --version` and `apache2 -v`. Compare with current WordPress requirements linked below. If the distribution’s supported packages no longer meet them, stop and update this practical rather than adding an unknown package repository.',
    'Check versions with `php -v`, `mariadb --version` and `apache2 -v`. As of the 2026-09-17 technical review, WordPress recommends PHP 8.3 or newer, MariaDB 10.11 or newer OR MySQL 8.0 or newer, plus HTTPS. Compare your actual versions with the current WordPress requirements linked below because these recommendations change. If the distribution’s supported packages no longer meet the current baseline, stop and update the practical rather than adding an unknown package repository.',
  )
  body = replace(
    body,
    'Here www-data is Apache’s service account. It can update this single site, which also means a compromised plugin can change it. Install only maintained plugins you need and keep updates/backups working. Never solve permissions with “777.”',
    'Here www-data is Apache’s service account. Giving the web-service account ownership of the whole tree is a simplified choice for this single-site disposable training environment. WordPress documentation recommends stronger per-site/user separation for shared or multi-site hosting so one PHP application cannot freely alter another. Do not copy this ownership model into a shared production server without designing permissions deliberately. Install only maintained plugins you need, keep updates/backups working, and never solve permissions with “777.”',
  )
  body = replace(
    body,
    '5. Before submitting any password in a browser, enable HTTPS. Run `sudo certbot --apache -d recovery.your-domain.org` with your actual hostname. Follow the certificate prompts and choose HTTPS redirection if offered. DNS must already resolve to this machine and port 80 must be reachable. If certificate issuance fails, check DNS (including any wrong IPv6/AAAA address) and firewalls; do not bypass browser warnings. Run `sudo certbot renew --dry-run` to check renewal. Confirm HTTPS opens without warnings. Use the official Certbot instructions for a changed package environment.',
    '5. Before submitting any password in a browser, enable HTTPS. Install Certbot using its current official Apache-on-Linux instructions rather than mixing an old distribution package, pip install and snap install on the same machine. Current Certbot instructions recommend the snap for most Linux users. Make sure snapd is available; if an OS-package Certbot is already installed, follow Certbot’s current instructions to remove that package before using the snap so two installations do not compete. Install with `sudo snap install --classic certbot`. If the `certbot` command is not already available, the current instructions use `sudo ln -s /snap/bin/certbot /usr/local/bin/certbot`. Once Certbot is installed, run `sudo certbot --apache -d recovery.your-domain.org` with your actual hostname. DNS must already resolve to this machine and the HTTP-01 validation path must be reachable on port 80; a stale or incorrect AAAA record can send validation to the wrong IPv6 host. Follow the prompts, enable HTTP-to-HTTPS redirection when appropriate, and do not bypass browser certificate warnings. Run `sudo certbot renew --dry-run` to test the installed renewal timer/job, then confirm HTTPS opens without warnings. If Certbot changes its supported installation method, follow its current official instructions instead of preserving these commands by habit.',
  )
  return body
}

function reviewBackup(body) {
  body = replace(
    body,
    'Open the downloaded archive with your file manager and check uploads and configuration exist. Never publish it. Do not place backups under the public web folder. Check command errors and file sizes; a failed dump is not a backup.',
    'Open the downloaded archive with your file manager and check uploads and configuration exist. Never publish it. Do not place backups under the public web folder. Check command errors and file sizes; a failed dump is not a backup. After the downloaded copies have been verified and at least one independent copy is safely stored, remove the temporary database/archive copies from the server’s root and login home directories so credential-bearing backup files are not left there indefinitely.',
  )
  body = replace(
    body,
    'On the self-hosted layout above, pause editing/uploads while taking a matching database/files copy. In SSH run `sudo mariadb-dump --single-transaction --result-file=/root/blog.sql blog`, then',
    'On the self-hosted layout above, pause editing/uploads while taking a matching database/files copy. Treat the database dump and filesystem archive as one backup set created at roughly the same point in time. In SSH run `sudo mariadb-dump --single-transaction --result-file=/root/blog.sql blog`, then',
  )
  body = replace(
    body,
    'These copies are still on the server until downloaded.',
    'For the normal InnoDB tables used by WordPress, `--single-transaction` produces a consistent database snapshot without locking tables for the duration of the dump; pausing site writes still helps keep the database and uploaded files aligned as one recovery set and avoids relying on that guarantee for any non-transactional tables. Check the command exit status and confirm the dump is non-empty. These copies are still on the server until downloaded.',
  )
  body = replace(
    body,
    'Only on this empty test destination, run `sudo mariadb blog < blog.sql` to load the backup records.',
    'Only on this empty test destination, and only after confirming it contains no data you need to preserve, run `sudo mariadb blog < blog.sql` to load the backup records. A restore command is destructive to whatever schema/data already occupies the target database; the empty disposable destination is the safety boundary.',
  )
  return body
}

function reviewDomain(body) {
  body = replace(
    body,
    'TTL is the time answers may remain cached; lower it in advance where useful, and allow the old TTL to expire.',
    'TTL is the time an answer may remain cached. If you lower it for a migration, do so far enough in advance that caches holding the previous, longer TTL have time to expire; changing the authoritative TTL does not retroactively shorten an answer already cached elsewhere.',
  )
  body = replace(
    body,
    'Use Lesson 8’s verification/rollback process. Check the new domain over HTTPS, individual post URLs and media from another device/network.',
    'Use Lesson 8’s verification/rollback process. After changing DNS, query an authoritative nameserver directly and compare it with one or more recursive resolvers; then check the new domain over HTTPS, individual post URLs and media from another device/network.',
  )
  return body
}

function reviewServer(body) {
  return replace(
    body,
    'Record the actual Ubuntu version with cat /etc/os-release.',
    'Record the actual Ubuntu version with `cat /etc/os-release`. Ubuntu Server enables unattended security updates by default on standard installations, but you still need to verify the update policy, third-party repositories, reboot requirements and service restarts for the machine you actually received.',
  )
}

function reviewFinish(body) {
  body = replace(
    body,
    'Another authorized person should be able to follow the instructions without needing undocumented knowledge from the original administrator.',
    'Another authorized person should be able to follow the instructions without needing undocumented knowledge from the original administrator. Have that person locate the independent backup and talk through the first restore and account-recovery steps; every point where they need hidden context is a handoff defect to fix.',
  )
  return replace(
    body,
    'Another person should be able to follow the instructions without guessing who Dave is.',
    'Another authorized person should be able to follow the instructions without needing undocumented knowledge from the original administrator.',
  )
}

export function applyRecoveryTechnicalReview(modules = []) {
  return modules.map((module) => {
    if (!REVIEWED.has(module?.id)) return module
    let body = String(module.body || '')
    if (module.id === 'blog-server') body = reviewServer(body)
    if (module.id === 'blog-selfhost') body = reviewSelfHost(body)
    if (module.id === 'blog-backup') body = reviewBackup(body)
    if (module.id === 'blog-domain') body = reviewDomain(body)
    if (module.id === 'blog-finish') body = reviewFinish(body)
    const sources = (module.sources || []).map((source) => ({
      ...source,
      note: 'Technical reference rechecked 2026-09-17; practical lab testing still required.',
    }))
    return { ...module, body, sources }
  })
}
