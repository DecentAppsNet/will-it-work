import { useState } from "react";

import ModalDialog from "@/components/modalDialogs/ModalDialog";
import DialogFooter from "../modalDialogs/DialogFooter";
import DialogButton from "../modalDialogs/DialogButton";
import { copyLogToClipboard } from "@/persistence/localLog";
import styles from './GetLogsDialog.module.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
}

function GetLogsDialog({ isOpen, onClose }: Props) {
  const [status, setStatus] = useState<string|null>(null);

  const statusContent = status ? <span className={styles.statusText}>{status}</span> : null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onCancel={onClose}
      title="Get Logs"
    >
      <p>If you choose the "copy logs" button below, you'll be able to paste the logs into 
      an email message, Github issue, or elsewhere.</p>
      
      <p>Logs are stored in your browser persistent storage with limited retention. Decent Apps are architecturally restricted from sending your data to servers.</p>

      {statusContent}
      <DialogFooter>
        <DialogButton text="Close" onClick={onClose} />
        <DialogButton text="Copy Logs" onClick={() => {
          copyLogToClipboard(7);
          setStatus('Logs copied to clipboard.');
          setTimeout(() => {
            setStatus('');
          }, 2000);
        }} isPrimary/>
      </DialogFooter>
    </ModalDialog>
  );
}

export default GetLogsDialog;