import { useState } from "react";

import { DecentBar, Link, defaultOnClickLink } from "decent-portal";
import GetLogsDialog from "../getLogsDialog/GetLogsDialog";

const GET_LOGS_LINK = "GET LOGS";
const appLinks = [
  { description: "Support", url: "https://github.com/DecentAppsNet/will-it-work/issues" },
  { description: "Logs", url: GET_LOGS_LINK}
];

const contributorText = "Erik Hermansen";

function TopBar() {
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  
  function _onClickLink(link:Link) {
    if (link.url === GET_LOGS_LINK) { setModalDialogName(GetLogsDialog.name); return; }
    defaultOnClickLink(link);
  }

  return <>
    <DecentBar 
      appName="Will It Work?" 
      appLinks={appLinks} 
      contributorText={contributorText}
      onClickLink={(link) => _onClickLink(link)}
    />
    <GetLogsDialog isOpen={modalDialogName === GetLogsDialog.name} onClose={() => setModalDialogName(null)} />
  </>
}

export default TopBar;