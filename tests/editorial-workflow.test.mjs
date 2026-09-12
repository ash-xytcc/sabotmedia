import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const adminUsers = fs.readFileSync(new URL('../functions/api/_lib/adminUsers.js', import.meta.url), 'utf8')
const nativeApi = fs.readFileSync(new URL('../functions/api/native-content.js', import.meta.url), 'utf8')
const revisionsApi = fs.readFileSync(new URL('../functions/api/native-content-revisions.js', import.meta.url), 'utf8')
const commentsApi = fs.readFileSync(new URL('../functions/api/editorial-comments.js', import.meta.url), 'utf8')
const contentList = fs.readFileSync(new URL('../src/components/ContentListPage.jsx', import.meta.url), 'utf8')
const usersPage = fs.readFileSync(new URL('../src/components/AdminUsersPage.jsx', import.meta.url), 'utf8')
const adminRail = fs.readFileSync(new URL('../src/components/AdminRail.jsx', import.meta.url), 'utf8')

test('contributor role can write and comment but cannot publish', () => {
  assert.match(adminUsers, /'contributor'/)
  assert.match(adminUsers, /contributor:\s*\['content:write', 'media:write', 'review:comment'\]/)
  assert.doesNotMatch(adminUsers, /contributor:\s*\[[^\]]*publishing:write/)
  assert.match(usersPage, /Contributor/)
})

test('native content API enforces ownership and publishing at the server boundary', () => {
  assert.match(nativeApi, /permissionHasCapability\(permission, 'publishing:write'\)/)
  assert.match(nativeApi, /contributors can save drafts and submit for review, but cannot publish or schedule/)
  assert.match(nativeApi, /createdByUserId/)
  assert.match(nativeApi, /contributors can only edit their own newsroom drafts/)
})

test('revision restore is editor-only and editorial discussion is authenticated', () => {
  assert.match(revisionsApi, /review:manage/)
  assert.match(commentsApi, /review:comment/)
  assert.match(commentsApi, /contributors can only comment on their own work/)
})

test('posts screen exposes a real review queue and editorial discussion', () => {
  assert.match(contentList, /Review Queue/)
  assert.match(contentList, /Changes Requested/)
  assert.match(contentList, /Approved/)
  assert.match(contentList, /Editorial Discussion/)
  assert.match(contentList, /Request changes/)
  assert.match(contentList, /Submit for Review/)
})

test('contributor navigation is narrowed to writing and allowed media tools', () => {
  assert.match(adminRail, /data-admin-role/)
  assert.match(adminRail, /capability: 'publishing:write'/)
  assert.match(adminRail, /native-content-editor__actions/)
})
