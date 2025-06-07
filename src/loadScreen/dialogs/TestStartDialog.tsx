import DialogButton from "@/components/modalDialogs/DialogButton";
import DialogFooter from "@/components/modalDialogs/DialogFooter";
import ModalDialog from "@/components/modalDialogs/ModalDialog";

type Props = {
  isOpen:boolean,
  onConfirm:()=>void
}

function TestStartDialog(props:Props) {
  const { isOpen, onConfirm } = props;

  if (!isOpen) return null;

  return (
    <ModalDialog title="Prepare to Load LLM" isOpen={isOpen}>
      <DialogFooter><DialogButton text="Start" onClick={onConfirm} isPrimary/></DialogFooter>
    </ModalDialog>
  );
}

export default TestStartDialog;