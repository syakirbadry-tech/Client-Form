# Client form changelog

The form version is set in `client-detail-form.html` (`FORM_VERSION`), shown in the form's footer, and saved with every submission in the Airtable **Form Version** column. When a question is added, removed or changed, bump the version and add an entry here, so any client record can be traced to the exact form the client saw.

| Version | Date | Changes |
|---|---|---|
| 2.0 | 2026-10-17 | Added the **Existing Coverage** step (step 5 of 8): does the client already have insurance/takaful protection, and for each policy the company, type, premium and how often it is paid. Started recording the form version. |
| 1.x | before 2026-10-17 | Earlier forms. Submissions from these have a blank Form Version. Includes the product dropdown (AnugerahMax / Warisan Gold / Anggun / Critical Care 360 / Asas 360) and agent form links. |
