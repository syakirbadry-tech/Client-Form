# Client-Form
PruBSN Takaful Client Form 

## Staff dashboard

`admin/` is the staff-only submissions dashboard: sign in at
https://syakirbadry-tech.github.io/Client-Form/admin/. Login and data are served
by the `prubsn-submission-service` Worker's `/admin/*` API (see
`backend/src/admin.js` and the "Admin dashboard API" section of `DEPLOYMENT.md`
in the quotation-generator repo). No credentials or client data live in this repo.
