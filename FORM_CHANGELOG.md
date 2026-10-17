# Client form changelog

The form version is set in `client-detail-form.html` (`FORM_VERSION`), shown in the form's footer, and saved with every submission in the Airtable **Form Version** column. When a question is added, removed or changed, bump the version and add an entry here, so any client record can be traced to the exact form the client saw.

| Version | Date | Changes |
|---|---|---|
| 3.0 | 2026-10-17 | New first step **Scan IC**: the client photographs the front and back of their MyKad (saved as the NRIC Front/Rear attachments, as before). The front is read automatically (Worker `POST /scan-ic`) to pre-fill full name, IC number, date of birth, address, gender and religion (only when ISLAM is printed); the client checks everything on the Personal Information step. Race is not printed on the MyKad, so the client still chooses it. If reading fails, the client types the details as before. The Documents step now only asks for the selfie and signature. 9 steps in total. |
| 2.0 | 2026-10-17 | Added the **Existing Coverage** step (step 5 of 8): does the client already have insurance/takaful protection, and for each policy the company, type, premium and how often it is paid. Started recording the form version. |
| 1.x | before 2026-10-17 | Earlier forms. Submissions from these have a blank Form Version. Includes the product dropdown (AnugerahMax / Warisan Gold / Anggun / Critical Care 360 / Asas 360) and agent form links. |
