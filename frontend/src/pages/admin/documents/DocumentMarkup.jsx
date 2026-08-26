import { memo } from 'react';
import { Link } from 'react-router-dom';
import { LETTERHEAD_LOGO } from './letterheadLogo';

/*
 * The document generator's markup, converted from admin/documents.html.
 *
 * INVARIANT: this component must render exactly once and never re-render.
 * documentsController.js owns everything inside it — it writes .value,
 * .textContent and .innerHTML directly, the way the original page did — so a
 * React re-render would silently wipe the user's work. It therefore takes no
 * props that change (a ref is stable), and is wrapped in memo() below.
 *
 * All three workspaces stay mounted at all times, even the two that are
 * hidden. paginateActive() measures all three sheets on every keystroke, and
 * confirmPrintPaper() toggles .hidden-print across all three before calling
 * window.print() — rendering only the active tab would break both.
 *
 * Form controls are uncontrolled (defaultValue / defaultChecked) for the same
 * reason: the controller assigns el.value directly when restoring a draft.
 *
 * Removed during conversion, all of it browser-extension or Save-Page-As
 * debris: the "saved from url=…" comment, the broken ./index_files/css2
 * stylesheet link, the nordpass chrome-extension @font-face block, and the
 * two injected aria-live divs.
 */
function DocumentMarkup({ rootRef }) {
  return (
    <div className="docgen" ref={rootRef}>

      <div className="appbar">
        <div className="appbar-inner">
          <div className="brandmark">B</div>
          <div className="brandtext">
            <div className="name">BIM Design &amp; Engineering Consultants</div>
            <div className="tag">Document System</div>
          </div>
          <div className="spacer"></div>
          <div className="docid">
            Active tab: <b id="activeTabLabel">Acknowledgement Receipt</b><br />
            Non‑VAT registered issuer
          </div>
          <div className="autosave-box no-print">
            <span id="autosaveStamp">Draft not saved yet</span>
            <button type="button" className="clear-draft-btn" data-onclick="clearSavedDraft()">Clear draft</button>
          </div>
          <div className="autosave-box no-print" id="portalNav">
            <Link to="/admin" className="portal-link">&larr; Dashboard</Link>
            <Link to="/admin/users" className="portal-link">Users</Link>
            <Link to="/admin/email" className="portal-link">Email</Link>
            <span id="portalWho"></span>
            <button type="button" className="clear-draft-btn" data-onclick="portalLogout()">Log out</button>
          </div>
        </div>
      </div>

      <div className="appshell">
        <div className="tabbar no-print">
          <button className="tabbtn" data-tab="proposal" data-onclick="switchTab('proposal')">
            <span className="num">
              01
            </span>
            Proposal
          </button>
          <button className="tabbtn" data-tab="invoice" data-onclick="switchTab('invoice')">
            <span className="num">
              02
            </span>
            Billing Invoice
          </button>
          <button className="tabbtn active" data-tab="ack" data-onclick="switchTab('ack')">
            <span className="num">
              03
            </span>
            Acknowledgement Receipt
          </button>
          <a className="tabbtn onedrive-files-tab" href="https://1drv.ms/f/c/1b24af0211eb28f6/IgCiehFET-cvRoksHIhBMlUUAZfDrgcspTIPXajOdDfLMek?e=xTy2ED" target="_blank" rel="noopener noreferrer" title="Open OneDrive Files">
            <span className="num">
              04
            </span>
            OneDrive Files
          </a>
        </div>
        <div className="page">
          <div className="panel">
            <div className="workspace hidden" id="workspace-proposal">
              <div className="editor no-print">
                <div className="h3row">
                  <h3>
                    Issuer letterhead
                  </h3>
                  <button type="button" className="lock-btn locked" id="lockbtn-letterhead-proposal" data-onclick="toggleLock('letterhead')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                    </svg>
                    <span>
                      Locked
                    </span>
                  </button>
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Firm address
                  </label>
                  <input id="p_addr" defaultValue="1187 Don Quijote St. Sampaloc, Brgy. 480, Metro Manila, Philippines" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Email
                  </label>
                  <input id="p_email" defaultValue="joemel.baccal@bimphilippines.org" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Phone
                  </label>
                  <input id="p_phone" defaultValue="(02)8832-3530/(63)917-541-3963" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Tax status
                  </label>
                  <input id="p_tin" defaultValue="Non-VAT Registered TIN: 343-962-880-00000" disabled />
                </div>
                <h3>
                  Client & reference
                </h3>
                <div className="field">
                  <label>
                    Client / attention to
                  </label>
                  <input id="p_client" defaultValue="" placeholder="e.g. MS. JUAN DELA CRUZ" />
                </div>
                <div className="field">
                  <label>
                    Client company
                  </label>
                  <input id="p_clientco" defaultValue="" placeholder="e.g. Client Company, Inc." />
                </div>
                <div className="row2">
                  <div className="field">
                    <label>
                      Quotation no.
                    </label>
                    <div className="gen-no-row">
                      <input id="p_qno" defaultValue="" placeholder="e.g. 20260826-0001" />
                      <button type="button" className="gen-no-btn" data-onclick="generateDocNumber('proposal')">
                        Generate No.
                      </button>
                    </div>
                    <div className="gen-no-status" id="qnoStatus_proposal"></div>
                  </div>
                  <div className="field">
                    <label>
                      Date
                    </label>
                    <input id="p_date" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="row2">
                  <div className="field">
                    <label>
                      Valid until
                    </label>
                    <input id="p_valid" defaultValue="" placeholder="e.g. 30 August 2026" />
                  </div>
                  <div className="field">
                    <label>
                      Project name
                    </label>
                    <input id="p_project" defaultValue="" placeholder="e.g. Project name" />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Project location
                  </label>
                  <input id="p_loc" defaultValue="" placeholder="e.g. Project site address" />
                </div>
                <h3>
                  Scope of work
                </h3>
                <div className="field">
                  <label>
                    Scope summary (one line per item)
                  </label>
                  <textarea id="p_scope" style={{ minHeight: "96px" }} defaultValue={"Professional Design and \"Sign and Seal\" Services\nDesign Layouts and Analysis per applicable engineering codes\nDesign Analysis: Load Computation, supporting diagrams\nAs-Built Plans upon project completion"} />
                </div>
                <h3>
                  Fee line items
                </h3>
                <div id="p_items"></div>
                <button className="add-item-btn" data-onclick="addItem('proposal')">
                  + Add line item
                </button>
                <h3>
                  Site visit / add-on fee (optional)
                </h3>
                <div className="field">
                  <label>
                    Note (excluded from total)
                  </label>
                  <input id="p_sitevisit" defaultValue="Site Visit Fee (excluded from total): Php 5,000.00 per visit" />
                </div>
                <h3>
                  Terms & conditions
                </h3>
                <div className="field">
                  <label>
                    Editable clauses
                  </label>
                  <textarea id="p_terms" style={{ minHeight: "190px" }} defaultValue={"a. Scope of Services — Services are limited to the scope stated in this proposal. Work not expressly included is treated as additional service, subject to separate fees and written approval.\nb. Design Responsibility — Designs follow accepted engineering practice and applicable codes, based on information provided by the Client and other project consultants. Contractors/suppliers remain responsible for installation, testing, and workmanship.\nc. Exclusions — Actual supply, installation, testing and commissioning works; construction supervision; permit/processing fees; BOQ/BOM or cost estimates unless separately agreed.\nd. Limitation of Liability — Liability is limited to the total professional fees received for the project.\ne. Document Ownership — Drawings and documents remain the intellectual property of BIMDEC until full settlement and are instruments of service.\nf. Confidentiality — Project information is treated as confidential except where disclosure is required for permits or authority coordination.\ng. Release of Deliverables — Final signed and sealed drawings are released upon settlement of the corresponding billing.\nh. Suspension/Cancellation — BIMDEC shall be compensated for services rendered to date; compensation shall not be less than 70% of the contract amount."} />
                </div>
                <h3>
                  Revision policy
                </h3>
                <div className="field">
                  <label>
                    Revision policy text
                  </label>
                  <textarea id="p_revisions" style={{ minHeight: "70px" }} defaultValue={"Reasonable revisions from consolidated client/PMO comments are included. Revisions arising from major layout or scope changes after approval are treated as additional scope and are subject to separate fees."} />
                </div>
                <h3>
                  Payment & lead time
                </h3>
                <div className="field">
                  <label>
                    Payment schedule
                  </label>
                  <textarea id="p_payment" style={{ minHeight: "64px" }} defaultValue={"50% Down Payment upon approval of proposal.\n50% upon submission and client's written acceptance of As-Built Drawings (soft copy).\nHard copies are issued only upon written confirmation to proceed with printing."} />
                </div>
                <div className="h3row">
                  <h3>
                    Payment channel
                  </h3>
                  <button type="button" className="lock-btn locked" id="lockbtn-paych-proposal" data-onclick="toggleLock('paych')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                    </svg>
                    <span>
                      Locked
                    </span>
                  </button>
                </div>
                <div className="field lk-paych locked">
                  <label>
                    Bank name
                  </label>
                  <input id="p_bankname" defaultValue="Bank of the Philippine Island (BPI)" disabled />
                </div>
                <div className="row2">
                  <div className="field lk-paych locked">
                    <label>
                      Account name
                    </label>
                    <input id="p_acctname" defaultValue="BIMDEC Engineering Design Services" disabled />
                  </div>
                  <div className="field lk-paych locked">
                    <label>
                      Account number
                    </label>
                    <input id="p_acctno" defaultValue="3099-2712-47" disabled />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Lead time
                  </label>
                  <input id="p_lead" defaultValue="PDF deliverables within seven (7) working days from complete design references." />
                </div>
                <h3>
                  Prepared by
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Prepared by (name)
                    </label>
                    <select id="p_prepby" data-onchange="renderPreview(); scheduleSave();">
                      <option defaultValue="ENGR. ______________">
                        ENGR. ______________
                      </option>
                      <option defaultValue="Engr. Joemel Baccal">
                        Engr. Joemel Baccal
                      </option>
                      <option defaultValue="Engr. Joseph Domingo">
                        Engr. Joseph Domingo
                      </option>
                    </select>
                  </div>
                  <div className="field">
                    <label>
                      Date prepared
                    </label>
                    <input id="p_prepdate" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="datetick-row">
                  <label className="tickopt">
                    <input type="checkbox" id="p_prepdate_day" data-onchange="updateAutoDate('p_prepdate')" />
                    Day
                  </label>
                  <label className="tickopt">
                    <input type="checkbox" id="p_prepdate_month" data-onchange="updateAutoDate('p_prepdate')" />
                    Month
                  </label>
                  <label className="tickopt">
                    <input type="checkbox" id="p_prepdate_year" data-onchange="updateAutoDate('p_prepdate')" />
                    Year
                  </label>
                  <span className="hint" style={{ margin: "0" }}>
                    Tick to auto-fill today's date parts
                  </span>
                </div>
                <div className="field">
                  <label>
                    Digital signature (PNG/JPG, optional)
                  </label>
                  <div className="sig-upload">
                    <input type="file" accept="image/png,image/jpeg" data-onchange="handleSigUpload('p_prepby', this)" />
                  </div>
                  <div className="sig-thumb-row" id="p_prepby_sigpreview"></div>
                </div>
                <div className="actions">
                  <button className="btn btn-print" data-onclick="printSheet('proposal')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9V2h12v7"></path>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print / Save as PDF
                  </button>
                  <button type="button" className="btn btn-print" id="saveRecordBtn_proposal" data-onclick="saveDocumentRecord('proposal')">
                    Save to records
                  </button>
                </div>
                <div className="send-status" id="saveRecordStatus_proposal"></div>
                <div className="print-hint no-print">
                  <b>
                    Before you print:
                  </b>
                  in the print dialog, open “More settings” and turn
                  <b>
                    Headers and footers
                  </b>
                  off (and set Margins to “Default” or “None”). That is what prints the file path/date/page‑number strip at the top and bottom of the PDF — it isn't part of this document and can only be turned off from that checkbox.
                  <br />
                  <br />
                  <b>
                    Save location:
                  </b>
                  browsers don't allow a webpage to silently save a file to your computer, so a folder picker can't be triggered automatically — for "Destination" choose
                  <b>
                    Save as PDF
                  </b>
                  , then in the Save dialog that opens, pick the folder you want. The filename is now pre-filled for you (from the Quotation No.).
                </div>
                <div className="send-email-box no-print">
                  <h4>
                    Send this to email
                  </h4>
                  <div className="send-email-row">
                    <input type="email" id="sendEmail_proposal" placeholder="client@example.com" />
                    <button type="button" className="btn btn-print" style={{ padding: "9px 16px" }} data-onclick="sendDocumentEmail('proposal')" id="sendBtn_proposal">
                      Send proposal
                    </button>
                  </div>
                  <div className="send-status" id="sendStatus_proposal"></div>
                </div>
              </div>
              <div className="preview-wrap" data-kind="proposal">
                <div className="preview-inner">
                  <div className="zoom-bar no-print">
                    <button type="button" className="zoom-btn" data-onclick="zoomOut('proposal')" aria-label="Zoom out">
                      −
                    </button>
                    <span className="zoom-level" id="zoomLevel_proposal">
                      80%
                    </span>
                    <button type="button" className="zoom-btn" data-onclick="zoomIn('proposal')" aria-label="Zoom in">
                      +
                    </button>
                    <button type="button" className="zoom-reset-btn" data-onclick="resetZoom('proposal')">
                      Reset
                    </button>
                    <span className="preview-page-nav" aria-label="Preview page navigation">
                      <button type="button" className="page-nav-btn" data-onclick="goHome('proposal')" id="pageHome_proposal" disabled>
                        Home
                      </button>
                      <button type="button" className="page-nav-btn" data-onclick="prevPage('proposal')" id="pagePrev_proposal" disabled>
                        Previous
                      </button>
                      <span className="page-nav-status" id="pageNav_proposal">
                        1 / 1
                      </span>
                      <button type="button" className="page-nav-btn" data-onclick="nextPage('proposal')" id="pageNext_proposal" disabled>
                        Next
                      </button>
                      <button type="button" className="page-nav-btn" data-onclick="goEnd('proposal')" id="pageEnd_proposal" disabled>
                        End
                      </button>
                    </span>
                    <span className="zoom-hint">
                      Ctrl+scroll to zoom
                    </span>
                  </div>
                  <div className="page-count-note no-print" id="pageCountProposal">
                    Continuous preview — 1 printed page
                  </div>
                  <div className="sheet" id="sheet-proposal" style={{ zoom: "0.8" }}>
                    <div className="screen-frame no-print"></div>
                    <div className="sheet-upper">
                      <div className="sheet-head" data-preview-page="1" data-page-hidden="false">
                        <div className="sheet-brand">
                          <img className="brand-logo" src={LETTERHEAD_LOGO} alt="BIMDEC logo" />
                          <div>
                            <div className="bname">
                              BIM Design & Engineering Consultants
                            </div>
                          </div>
                        </div>
                        <div className="sheet-meta" id="pv_p_letterhead">
                          1187 Don Quijote St. Sampaloc, Metro Manila, Philippines
joemel.baccal@bimphilippines.org
(02)8832-3530/(63)917-541-3963
Non-VAT Registered TIN: 343-962-880-00000
                        </div>
                      </div>
                      <span className="doctitle" data-preview-page="1" data-page-hidden="false">
                        PROFESSIONAL DESIGN PROPOSAL
                      </span>
                      <div className="docsub" data-preview-page="1" data-page-hidden="false">
                        Quotation No.
                        <span id="pv_p_qno"></span>
                        ·  Non‑VAT Official Quotation
                      </div>
                      <div className="kv-grid" data-preview-page="1" data-page-hidden="false">
                        <div className="kv">
                          <span className="k">
                            Client
                          </span>
                          <span className="v" id="pv_p_client"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Date
                          </span>
                          <span className="v" id="pv_p_date"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Company
                          </span>
                          <span className="v" id="pv_p_clientco"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Valid until
                          </span>
                          <span className="v" id="pv_p_valid"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Project
                          </span>
                          <span className="v" id="pv_p_project"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Location
                          </span>
                          <span className="v" id="pv_p_loc"></span>
                        </div>
                      </div>
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Scope of work
                      </div>
                      <ul className="scope-list" id="pv_p_scope" data-preview-page="1" data-page-hidden="false"></ul>
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Professional fees
                      </div>
                      <table className="doc-table" data-preview-page="1" data-page-hidden="false">
                        <thead>
                          <tr>
                            <th style={{ width: "52%" }}>
                              Description
                            </th>
                            <th className="num">
                              Qty
                            </th>
                            <th className="num">
                              Unit price
                            </th>
                            <th className="num">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody id="pv_p_items"></tbody>
                      </table>
                      <div className="totals" id="pv_p_totals" data-preview-page="1" data-page-hidden="false">
                        <div className="trow">
                          <span className="k">
                            Total professional fee
                          </span>
                          <span>
                            Php 0.00
                          </span>
                        </div>
                        <div className="trow grand">
                          <span className="k">
                            Total contract price
                            <span className="nonvat-badge">
                              NON‑VAT
                            </span>
                          </span>
                          <span>
                            Php 0.00
                          </span>
                        </div>
                      </div>
                      <div className="hint" style={{ marginTop: "6px" }} id="pv_p_sitevisit" data-preview-page="1" data-page-hidden="false"></div>
                      <div className="sec-title terms-heading" data-preview-page="1" data-page-hidden="false">
                        Terms & conditions
                      </div>
                      <div className="terms" id="pv_p_terms" data-preview-page="1" data-page-hidden="false"></div>
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Revision policy
                      </div>
                      <div className="terms" id="pv_p_revisions" data-preview-page="1" data-page-hidden="false"></div>
                    </div>
                    <div className="sheet-lower">
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Payment terms
                      </div>
                      <div className="terms" id="pv_p_payment" data-preview-page="1" data-page-hidden="false"></div>
                      <div className="hint" id="pv_p_lead" data-preview-page="1" data-page-hidden="false">
                        Lead time:
                      </div>
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Payment channel
                      </div>
                      <div className="terms" id="pv_p_paych" data-preview-page="1" data-page-hidden="false">
                        Bank: Bank of the Philippine Island (BPI)
                        <br />
                        Account Name: BIMDEC Engineering Design Services
                        <br />
                        Account Number: 3099-2712-47
                      </div>
                      <div className="signblock" data-preview-page="1" data-page-hidden="false">
                        <div className="sigline">
                          <img className="sig-img hidden" id="pv_p_prepby_sig" />
                          <div id="pv_p_prepby">
                            ENGR. ______________  ·  20 August 2026
                          </div>
                          <div className="role">
                            Prepared by · BIMDEC
                          </div>
                        </div>
                        <div className="sigline">
                          Authorized Client Signature
                          <div className="role">
                            Client acceptance & date
                          </div>
                        </div>
                      </div>
                      <div className="titleblock" data-preview-page="1" data-page-hidden="false">
                        <div className="tb-cell">
                          <span className="tb-label">
                            Document
                          </span>
                          Design Proposal
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            No.
                          </span>
                          <span id="tb_p_qno"></span>
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            Date
                          </span>
                          <span id="tb_p_date"></span>
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            Tax status
                          </span>
                          Non‑VAT
                        </div>
                      </div>
                    </div>
                    <div className="sheet-foot" data-preview-page="1" data-page-hidden="false">
                      <span>
                        BIM Design & Engineering Consultants
                      </span>
                      <span>
                        Instrument of Service — Confidential
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="workspace hidden" id="workspace-invoice">
              <div className="editor no-print">
                <div className="h3row">
                  <h3>
                    Issuer letterhead
                  </h3>
                  <button type="button" className="lock-btn locked" id="lockbtn-letterhead-invoice" data-onclick="toggleLock('letterhead')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                    </svg>
                    <span>
                      Locked
                    </span>
                  </button>
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Firm address
                  </label>
                  <input id="i_addr" defaultValue="1187 Don Quijote St. Sampaloc, Brgy. 480, Metro Manila, Philippines" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Email
                  </label>
                  <input id="i_email" defaultValue="joemel.baccal@bimphilippines.org" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Phone
                  </label>
                  <input id="i_phone" defaultValue="(02)8832-3530/(63)917-541-3963" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Tax status
                  </label>
                  <input id="i_tin" defaultValue="Non-VAT Registered TIN: 343-962-880-00000" disabled />
                </div>
                <h3>
                  Billing details
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Invoice no.
                    </label>
                    <div className="gen-no-row">
                      <input id="i_invno" defaultValue="" placeholder="e.g. 20260826-0001" />
                      <button type="button" className="gen-no-btn" data-onclick="generateDocNumber('invoice')">
                        Generate No.
                      </button>
                    </div>
                    <div className="gen-no-status" id="qnoStatus_invoice"></div>
                  </div>
                  <div className="field">
                    <label>
                      Date
                    </label>
                    <input id="i_date" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Customer / bill to
                  </label>
                  <input id="i_customer" defaultValue="" placeholder="e.g. CLIENT COMPANY, INC." />
                </div>
                <div className="field">
                  <label>
                    Customer address
                  </label>
                  <input id="i_custaddr" defaultValue="" placeholder="e.g. City, Metro Manila" />
                </div>
                <div className="row2">
                  <div className="field">
                    <label>
                      Project name
                    </label>
                    <input id="i_project" defaultValue="" placeholder="e.g. Project name" />
                  </div>
                  <div className="field">
                    <label>
                      Project location
                    </label>
                    <input id="i_loc" defaultValue="" placeholder="e.g. Project site address" />
                  </div>
                </div>
                <h3>
                  Billed items
                </h3>
                <div id="i_items"></div>
                <button className="add-item-btn" data-onclick="addItem('invoice')">
                  + Add line item
                </button>
                <h3>
                  Deductions (optional)
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Less: Down payment
                    </label>
                    <input id="i_dp" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="field">
                    <label>
                      Less: Discount
                    </label>
                    <input id="i_disc" type="number" step="0.01" defaultValue="0" />
                  </div>
                </div>
                <div className="h3row">
                  <h3>
                    Payment channel
                  </h3>
                  <button type="button" className="lock-btn locked" id="lockbtn-paych-invoice" data-onclick="toggleLock('paych')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                    </svg>
                    <span>
                      Locked
                    </span>
                  </button>
                </div>
                <div className="field lk-paych locked">
                  <label>
                    Bank name
                  </label>
                  <input id="i_bankname" defaultValue="Bank of the Philippine Island (BPI)" disabled />
                </div>
                <div className="row2">
                  <div className="field lk-paych locked">
                    <label>
                      Account name
                    </label>
                    <input id="i_acctname" defaultValue="BIMDEC Engineering Design Services" disabled />
                  </div>
                  <div className="field lk-paych locked">
                    <label>
                      Account number
                    </label>
                    <input id="i_acctno" defaultValue="3099-2712-47" disabled />
                  </div>
                </div>
                <h3>
                  Sign-off
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Prepared by
                    </label>
                    <select id="i_prepby" data-onchange="renderPreview(); scheduleSave();">
                      <option defaultValue="ENGR. ______________">
                        ENGR. ______________
                      </option>
                      <option defaultValue="Engr. Joemel Baccal">
                        Engr. Joemel Baccal
                      </option>
                      <option defaultValue="Engr. Joseph Domingo">
                        Engr. Joseph Domingo
                      </option>
                    </select>
                  </div>
                  <div className="field">
                    <label>
                      Date
                    </label>
                    <input id="i_prepdate" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="datetick-row">
                  <label className="tickopt">
                    <input type="checkbox" id="i_prepdate_day" data-onchange="updateAutoDate('i_prepdate')" />
                    Day
                  </label>
                  <label className="tickopt">
                    <input type="checkbox" id="i_prepdate_month" data-onchange="updateAutoDate('i_prepdate')" />
                    Month
                  </label>
                  <label className="tickopt">
                    <input type="checkbox" id="i_prepdate_year" data-onchange="updateAutoDate('i_prepdate')" />
                    Year
                  </label>
                  <span className="hint" style={{ margin: "0" }}>
                    Tick to auto-fill today's date parts
                  </span>
                </div>
                <div className="field">
                  <label>
                    Prepared-by signature (PNG/JPG, optional)
                  </label>
                  <div className="sig-upload">
                    <input type="file" accept="image/png,image/jpeg" data-onchange="handleSigUpload('i_prepby', this)" />
                  </div>
                  <div className="sig-thumb-row" id="i_prepby_sigpreview"></div>
                </div>
                <div className="row2">
                  <div className="field">
                    <label>
                      Approved by
                    </label>
                    <input id="i_appby" defaultValue="" />
                  </div>
                  <div className="field">
                    <label>
                      Date
                    </label>
                    <input id="i_appdate" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Approved-by signature (PNG/JPG, optional)
                  </label>
                  <div className="sig-upload">
                    <input type="file" accept="image/png,image/jpeg" data-onchange="handleSigUpload('i_appby', this)" />
                  </div>
                  <div className="sig-thumb-row" id="i_appby_sigpreview"></div>
                </div>
                <div className="actions">
                  <button className="btn btn-print" data-onclick="printSheet('invoice')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9V2h12v7"></path>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print / Save as PDF
                  </button>
                  <button type="button" className="btn btn-print" id="saveRecordBtn_invoice" data-onclick="saveDocumentRecord('invoice')">
                    Save to records
                  </button>
                </div>
                <div className="send-status" id="saveRecordStatus_invoice"></div>
                <div className="print-hint no-print">
                  <b>
                    Before you print:
                  </b>
                  in the print dialog, open “More settings” and turn
                  <b>
                    Headers and footers
                  </b>
                  off (and set Margins to “Default” or “None”). That is what prints the file path/date/page‑number strip at the top and bottom of the PDF — it isn't part of this document and can only be turned off from that checkbox.
                  <br />
                  <br />
                  <b>
                    Save location:
                  </b>
                  browsers don't allow a webpage to silently save a file to your computer, so a folder picker can't be triggered automatically — for "Destination" choose
                  <b>
                    Save as PDF
                  </b>
                  , then in the Save dialog that opens, pick the folder you want. The filename is now pre-filled for you (from the Invoice No.).
                </div>
                <div className="send-email-box no-print">
                  <h4>
                    Send this to email
                  </h4>
                  <div className="send-email-row">
                    <input type="email" id="sendEmail_invoice" placeholder="client@example.com" />
                    <button type="button" className="btn btn-print" style={{ padding: "9px 16px" }} data-onclick="sendDocumentEmail('invoice')" id="sendBtn_invoice">
                      Send invoice
                    </button>
                  </div>
                  <div className="send-status" id="sendStatus_invoice"></div>
                </div>
              </div>
              <div className="preview-wrap" data-kind="invoice">
                <div className="preview-inner">
                  <div className="zoom-bar no-print">
                    <button type="button" className="zoom-btn" data-onclick="zoomOut('invoice')" aria-label="Zoom out">
                      −
                    </button>
                    <span className="zoom-level" id="zoomLevel_invoice">
                      80%
                    </span>
                    <button type="button" className="zoom-btn" data-onclick="zoomIn('invoice')" aria-label="Zoom in">
                      +
                    </button>
                    <button type="button" className="zoom-reset-btn" data-onclick="resetZoom('invoice')">
                      Reset
                    </button>
                    <span className="preview-page-nav" aria-label="Preview page navigation">
                      <button type="button" className="page-nav-btn" data-onclick="goHome('invoice')" id="pageHome_invoice" disabled>
                        Home
                      </button>
                      <button type="button" className="page-nav-btn" data-onclick="prevPage('invoice')" id="pagePrev_invoice" disabled>
                        Previous
                      </button>
                      <span className="page-nav-status" id="pageNav_invoice">
                        1 / 1
                      </span>
                      <button type="button" className="page-nav-btn" data-onclick="nextPage('invoice')" id="pageNext_invoice" disabled>
                        Next
                      </button>
                      <button type="button" className="page-nav-btn" data-onclick="goEnd('invoice')" id="pageEnd_invoice" disabled>
                        End
                      </button>
                    </span>
                    <span className="zoom-hint">
                      Ctrl+scroll to zoom
                    </span>
                  </div>
                  <div className="page-count-note no-print" id="pageCountInvoice">
                    Continuous preview — 1 printed page
                  </div>
                  <div className="sheet" id="sheet-invoice" style={{ zoom: "0.8" }}>
                    <div className="screen-frame no-print"></div>
                    <div className="sheet-upper">
                      <div className="sheet-head" data-preview-page="1" data-page-hidden="false">
                        <div className="sheet-brand">
                          <img className="brand-logo" src={LETTERHEAD_LOGO} alt="BIMDEC logo" />
                          <div>
                            <div className="bname">
                              BIM Design & Engineering Consultants
                            </div>
                          </div>
                        </div>
                        <div className="sheet-meta" id="pv_i_letterhead">
                          1187 Don Quijote St. Sampaloc, Metro Manila, Philippines
joemel.baccal@bimphilippines.org
(02)8832-3530/(63)917-541-3963
Non-VAT Registered TIN: 343-962-880-00000
                        </div>
                      </div>
                      <span className="doctitle" data-preview-page="1" data-page-hidden="false">
                        BILLING INVOICE
                      </span>
                      <span className="nonvat-badge" data-preview-page="1" data-page-hidden="false">
                        NON‑VAT
                      </span>
                      <div className="docsub" data-preview-page="1" data-page-hidden="false">
                        Invoice No.
                        <span id="pv_i_invno"></span>
                      </div>
                      <div className="kv-grid" data-preview-page="1" data-page-hidden="false">
                        <div className="kv">
                          <span className="k">
                            Bill to
                          </span>
                          <span className="v" id="pv_i_customer"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Date
                          </span>
                          <span className="v" id="pv_i_date"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Address
                          </span>
                          <span className="v" id="pv_i_custaddr"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Project
                          </span>
                          <span className="v" id="pv_i_project"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Location
                          </span>
                          <span className="v" id="pv_i_loc"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Tax status
                          </span>
                          <span className="v">
                            Non‑VAT
                          </span>
                        </div>
                      </div>
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Service / transaction description
                      </div>
                      <table className="doc-table" data-preview-page="1" data-page-hidden="false">
                        <thead>
                          <tr>
                            <th style={{ width: "52%" }}>
                              Description
                            </th>
                            <th className="num">
                              Qty
                            </th>
                            <th className="num">
                              Unit price
                            </th>
                            <th className="num">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody id="pv_i_items"></tbody>
                      </table>
                      <div className="totals" id="pv_i_totals" data-preview-page="1" data-page-hidden="false">
                        <div className="trow">
                          <span className="k">
                            Subtotal (Non‑VAT)
                          </span>
                          <span>
                            Php 0.00
                          </span>
                        </div>
                        <div className="trow grand">
                          <span className="k">
                            Total amount due
                            <span className="nonvat-badge">
                              NON‑VAT
                            </span>
                          </span>
                          <span>
                            Php 0.00
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="sheet-lower">
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Payment channel
                      </div>
                      <div className="terms" id="pv_i_paych" data-preview-page="1" data-page-hidden="false">
                        Bank: Bank of the Philippine Island (BPI)
                        <br />
                        Account Name: BIMDEC Engineering Design Services
                        <br />
                        Account Number: 3099-2712-47
                      </div>
                      <div className="signblock" data-preview-page="1" data-page-hidden="false">
                        <div className="sigline">
                          <img className="sig-img hidden" id="pv_i_prepby_sig" />
                          <div id="pv_i_prepby">
                            ENGR. ______________  ·  20 August 2026
                          </div>
                          <div className="role">
                            Prepared by
                          </div>
                        </div>
                        <div className="sigline">
                          <img className="sig-img hidden" id="pv_i_appby_sig" />
                          <div id="pv_i_appby">
                            —
                          </div>
                          <div className="role">
                            Approved by
                          </div>
                        </div>
                      </div>
                      <div className="titleblock" data-preview-page="1" data-page-hidden="false">
                        <div className="tb-cell">
                          <span className="tb-label">
                            Document
                          </span>
                          Billing Invoice
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            No.
                          </span>
                          <span id="tb_i_invno"></span>
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            Date
                          </span>
                          <span id="tb_i_date"></span>
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            Tax status
                          </span>
                          Non‑VAT
                        </div>
                      </div>
                    </div>
                    <div className="sheet-foot" data-preview-page="1" data-page-hidden="false">
                      <span>
                        BIM Design & Engineering Consultants
                      </span>
                      <span>
                        Design Smarter! Execute Sharper!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="workspace" id="workspace-ack">
              <div className="editor no-print">
                <div className="h3row">
                  <h3>
                    Issuer letterhead
                  </h3>
                  <button type="button" className="lock-btn locked" id="lockbtn-letterhead-ack" data-onclick="toggleLock('letterhead')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                    </svg>
                    <span>
                      Locked
                    </span>
                  </button>
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Firm address
                  </label>
                  <input id="a_addr" defaultValue="1187 Don Quijote St. Sampaloc, Brgy. 480, Metro Manila, Philippines" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Email
                  </label>
                  <input id="a_email" defaultValue="joemel.baccal@bimphilippines.org" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Phone
                  </label>
                  <input id="a_phone" defaultValue="(02)8832-3530/(63)917-541-3963" disabled />
                </div>
                <div className="field lk-letterhead locked">
                  <label>
                    Tax status
                  </label>
                  <input id="a_tin" defaultValue="Non-VAT Registered TIN: 343-962-880-00000" disabled />
                </div>
                <h3>
                  Receipt details
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Receipt no.
                    </label>
                    <div className="gen-no-row">
                      <input id="a_recno" defaultValue="" placeholder="e.g. 20260826-0001" />
                      <button type="button" className="gen-no-btn" data-onclick="generateDocNumber('ack')">
                        Generate No.
                      </button>
                    </div>
                    <div className="gen-no-status" id="qnoStatus_ack"></div>
                  </div>
                  <div className="field">
                    <label>
                      Date
                    </label>
                    <input id="a_date" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Received from
                  </label>
                  <input id="a_receivedfrom" defaultValue="" placeholder="e.g. CLIENT COMPANY, INC." />
                </div>
                <div className="row2">
                  <div className="field">
                    <label>
                      Amount (figures)
                    </label>
                    <input id="a_amount" type="number" step="0.01" defaultValue="" placeholder="0.00" />
                  </div>
                  <div className="field">
                    <label>
                      Reference no. (invoice/proposal)
                    </label>
                    <input id="a_refno" defaultValue="" placeholder="e.g. BI-20260826-0001" />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Amount in words
                  </label>
                  <input id="a_amountwords" defaultValue="" placeholder="e.g. Amount in words" />
                </div>
                <h3>
                  Particulars
                </h3>
                <div className="field">
                  <label>
                    For payment of (add one line per item — particulars + amount)
                  </label>
                </div>
                <div id="a_items"></div>
                <button className="add-item-btn" data-onclick="addAckItem()">
                  + Add particulars line
                </button>
                <h3>
                  Payment method
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Method (Cash / Check / Bank Transfer / E-wallet)
                    </label>
                    <input id="a_paymethod" defaultValue="" placeholder="e.g. Cash / Check / Bank Transfer / E-wallet" />
                  </div>
                  <div className="field">
                    <label>
                      Reference / bank / check no.
                    </label>
                    <input id="a_paydetails" defaultValue="" placeholder="e.g. Bank — Ref. No." />
                  </div>
                </div>
                <h3>
                  Prepared by
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Prepared by (name)
                    </label>
                    <select id="a_recvby" data-onchange="renderPreview(); scheduleSave();">
                      <option defaultValue="">
                        — Select —
                      </option>
                      <option defaultValue="Engr. Joemel Baccal">
                        Engr. Joemel Baccal
                      </option>
                      <option defaultValue="Engr. Joseph Domingo">
                        Engr. Joseph Domingo
                      </option>
                    </select>
                  </div>
                  <div className="field">
                    <label>
                      Date
                    </label>
                    <input id="a_recvdate" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Digital signature (PNG/JPG, optional)
                  </label>
                  <div className="sig-upload">
                    <input type="file" accept="image/png,image/jpeg" data-onchange="handleSigUpload('a_recvby', this)" />
                  </div>
                  <div className="sig-thumb-row" id="a_recvby_sigpreview"></div>
                </div>
                <h3>
                  Received by
                </h3>
                <div className="row2">
                  <div className="field">
                    <label>
                      Received by
                    </label>
                    <input id="a_appby" defaultValue="" />
                  </div>
                  <div className="field">
                    <label>
                      Date
                    </label>
                    <input id="a_appdate" defaultValue="" placeholder="e.g. 20 August 2026" />
                  </div>
                </div>
                <div className="datetick-row">
                  <label className="tickopt">
                    <input type="checkbox" id="a_appdate_day" data-onchange="updateAutoDate('a_appdate')" />
                    Day
                  </label>
                  <label className="tickopt">
                    <input type="checkbox" id="a_appdate_month" data-onchange="updateAutoDate('a_appdate')" />
                    Month
                  </label>
                  <label className="tickopt">
                    <input type="checkbox" id="a_appdate_year" data-onchange="updateAutoDate('a_appdate')" />
                    Year
                  </label>
                  <span className="hint" style={{ margin: "0" }}>
                    Tick to auto-fill today's date parts
                  </span>
                </div>
                <div className="field">
                  <label>
                    Received-by signature (PNG/JPG, optional)
                  </label>
                  <div className="sig-upload">
                    <input type="file" accept="image/png,image/jpeg" data-onchange="handleSigUpload('a_appby', this)" />
                  </div>
                  <div className="sig-thumb-row" id="a_appby_sigpreview"></div>
                </div>
                <div className="actions">
                  <button className="btn btn-print" data-onclick="printSheet('ack')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9V2h12v7"></path>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print / Save as PDF
                  </button>
                  <button type="button" className="btn btn-print" id="saveRecordBtn_ack" data-onclick="saveDocumentRecord('ack')">
                    Save to records
                  </button>
                </div>
                <div className="send-status" id="saveRecordStatus_ack"></div>
                <div className="print-hint no-print">
                  <b>
                    Before you print:
                  </b>
                  in the print dialog, open “More settings” and turn
                  <b>
                    Headers and footers
                  </b>
                  off (and set Margins to “Default” or “None”). That is what prints the file path/date/page‑number strip at the top and bottom of the PDF — it isn't part of this document and can only be turned off from that checkbox.
                  <br />
                  <br />
                  <b>
                    Save location:
                  </b>
                  browsers don't allow a webpage to silently save a file to your computer, so a folder picker can't be triggered automatically — for "Destination" choose
                  <b>
                    Save as PDF
                  </b>
                  , then in the Save dialog that opens, pick the folder you want. The filename is now pre-filled for you (from the Receipt No.).
                </div>
                <div className="send-email-box no-print">
                  <h4>
                    Send this to email
                  </h4>
                  <div className="send-email-row">
                    <input type="email" id="sendEmail_ack" placeholder="client@example.com" />
                    <button type="button" className="btn btn-print" style={{ padding: "9px 16px" }} data-onclick="sendDocumentEmail('ack')" id="sendBtn_ack">
                      Send receipt
                    </button>
                  </div>
                  <div className="send-status" id="sendStatus_ack"></div>
                </div>
              </div>
              <div className="preview-wrap" data-kind="ack">
                <div className="preview-inner">
                  <div className="zoom-bar no-print">
                    <button type="button" className="zoom-btn" data-onclick="zoomOut('ack')" aria-label="Zoom out">
                      −
                    </button>
                    <span className="zoom-level" id="zoomLevel_ack">
                      80%
                    </span>
                    <button type="button" className="zoom-btn" data-onclick="zoomIn('ack')" aria-label="Zoom in">
                      +
                    </button>
                    <button type="button" className="zoom-reset-btn" data-onclick="resetZoom('ack')">
                      Reset
                    </button>
                    <span className="preview-page-nav" aria-label="Preview page navigation">
                      <button type="button" className="page-nav-btn" data-onclick="goHome('ack')" id="pageHome_ack" disabled>
                        Home
                      </button>
                      <button type="button" className="page-nav-btn" data-onclick="prevPage('ack')" id="pagePrev_ack" disabled>
                        Previous
                      </button>
                      <span className="page-nav-status" id="pageNav_ack">
                        1 / 2
                      </span>
                      <button type="button" className="page-nav-btn" data-onclick="nextPage('ack')" id="pageNext_ack">
                        Next
                      </button>
                      <button type="button" className="page-nav-btn" data-onclick="goEnd('ack')" id="pageEnd_ack">
                        End
                      </button>
                    </span>
                    <span className="zoom-hint">
                      Ctrl+scroll to zoom
                    </span>
                  </div>
                  <div className="page-count-note no-print" id="pageCountAck">
                    Continuous preview — 2 printed pages
                  </div>
                  <div className="sheet" id="sheet-ack" style={{ zoom: "0.8" }}>
                    <div className="screen-frame no-print"></div>
                    <div className="sheet-upper">
                      <div className="sheet-head" data-preview-page="1" data-page-hidden="false">
                        <div className="sheet-brand">
                          <img className="brand-logo" src={LETTERHEAD_LOGO} alt="BIMDEC logo" />
                          <div>
                            <div className="bname">
                              BIM Design & Engineering Consultants
                            </div>
                          </div>
                        </div>
                        <div className="sheet-meta" id="pv_a_letterhead">
                          1187 Don Quijote St. Sampaloc, Metro Manila, Philippines
joemel.baccal@bimphilippines.org
(02)8832-3530/(63)917-541-3963
Non-VAT Registered TIN: 343-962-880-00000
                        </div>
                      </div>
                      <span className="doctitle" data-preview-page="1" data-page-hidden="false">
                        ACKNOWLEDGEMENT RECEIPT
                      </span>
                      <span className="nonvat-badge" data-preview-page="1" data-page-hidden="false">
                        NON‑VAT
                      </span>
                      <div className="docsub" data-preview-page="1" data-page-hidden="false">
                        Receipt No.
                        <span id="pv_a_recno"></span>
                      </div>
                      <div className="kv-grid" data-preview-page="1" data-page-hidden="false">
                        <div className="kv">
                          <span className="k">
                            Received from
                          </span>
                          <span className="v" id="pv_a_receivedfrom"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Date
                          </span>
                          <span className="v" id="pv_a_date"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Reference no.
                          </span>
                          <span className="v" id="pv_a_refno"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Payment method
                          </span>
                          <span className="v" id="pv_a_paymethod">
                            Bank Transfer
                          </span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Payment details
                          </span>
                          <span className="v" id="pv_a_paydetails"></span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Tax status
                          </span>
                          <span className="v">
                            Non‑VAT
                          </span>
                        </div>
                      </div>
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Particulars
                      </div>
                      <div className="terms" id="pv_a_particulars" data-preview-page="1" data-page-hidden="false"></div>
                      <div className="hint" style={{ marginTop: "4px" }} id="pv_a_subtotal" data-preview-page="1" data-page-hidden="false">
                        Particulars subtotal: Php 0.00
                      </div>
                      <div className="totals" id="pv_a_totals" data-preview-page="1" data-page-hidden="false">
                        <div className="trow grand">
                          <span className="k">
                            Amount received
                            <span className="nonvat-badge">
                              NON‑VAT
                            </span>
                          </span>
                          <span>
                            Php 0.00
                          </span>
                        </div>
                      </div>
                      <div className="hint" style={{ marginTop: "6px" }} id="pv_a_amountwords" data-preview-page="1" data-page-hidden="false">
                        Amount in words:
                      </div>
                      <div className="sec-title" data-preview-page="1" data-page-hidden="false">
                        Acknowledgement
                      </div>
                      <div className="terms" data-preview-page="1" data-page-hidden="false">
                        This is to acknowledge receipt from the party named above of the amount stated, in good and full consideration of the particulars indicated, through the payment method specified. This receipt is issued for record purposes and does not constitute a BIR Official Receipt; the corresponding Non‑VAT Official Receipt/Invoice, if required, shall be issued separately.
                      </div>
                    </div>
                    <div className="sheet-lower">
                      <div className="signblock" data-preview-page="1" data-page-hidden="false">
                        <div className="sigline">
                          <img className="sig-img hidden" id="pv_a_recvby_sig" />
                          <div id="pv_a_recvby">
                            ·  20 August 2026
                          </div>
                          <div className="role">
                            Prepared by · BIMDEC
                          </div>
                        </div>
                        <div className="sigline">
                          <img className="sig-img hidden" id="pv_a_appby_sig" />
                          <div id="pv_a_appby">
                            —
                          </div>
                          <div className="role">
                            Received by · BIMDEC
                          </div>
                        </div>
                        <div className="sigline">
                          Payor / Authorized Representative Signature
                          <div className="role">
                            Payor acknowledgement
                          </div>
                        </div>
                      </div>
                      <div className="titleblock" data-preview-page="2" data-page-hidden="false">
                        <div className="tb-cell">
                          <span className="tb-label">
                            Document
                          </span>
                          Acknowledgement Receipt
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            No.
                          </span>
                          <span id="tb_a_recno"></span>
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            Date
                          </span>
                          <span id="tb_a_date"></span>
                        </div>
                        <div className="tb-cell">
                          <span className="tb-label">
                            Tax status
                          </span>
                          Non‑VAT
                        </div>
                      </div>
                    </div>
                    <div className="sheet-foot" data-preview-page="2" data-page-hidden="false">
                      <span>
                        BIM Design & Engineering Consultants
                      </span>
                      <span>
                        Instrument of Service — Confidential
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="print-paper-modal no-print" id="printPaperModal" role="dialog" aria-modal="true" aria-labelledby="printPaperTitle">
        <div className="print-paper-card">
          <h3 id="printPaperTitle">
            Print / Save as PDF
          </h3>
          <p>
            Select the paper size for the exported document. All pages will be printed, regardless of which page is currently visible in Preview.
          </p>
          <select className="print-paper-select" id="printPaperSize" defaultValue="a4">
            <option defaultValue="legal">
              Legal — 8.5 × 14 in
            </option>
            <option defaultValue="letter">
              Letter — 8.5 × 11 in
            </option>
            <option defaultValue="a3">
              A3 — 297 × 420 mm
            </option>
            <option defaultValue="a4">
              A4 — 210 × 297 mm
            </option>
            <option defaultValue="executive">
              Executive — 7.25 × 10.5 in
            </option>
            <option defaultValue="tabloid">
              Tabloid — 11 × 17 in
            </option>
            <option defaultValue="statement">
              Statement — 5.5 × 8.5 in
            </option>
          </select>
          <div className="print-paper-actions">
            <button type="button" data-onclick="closePrintPaperModal()">
              Cancel
            </button>
            <button type="button" className="primary" data-onclick="confirmPrintPaper()">
              Continue to Print
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default memo(DocumentMarkup);
