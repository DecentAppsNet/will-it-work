import OkayDialog from "@/components/modalDialogs/OkayDialog";

type Props = {
  onConfirm: () => void,
  isOpen: boolean
}

function BetaWarningDialog({onConfirm, isOpen}:Props) {
  return (
    <OkayDialog 
      title="Beta Warning" 
      onOkay={onConfirm} 
      okayText="Continue" 
      isOpen={isOpen}
      description="Running the memory test may crash your operating system. (There's a tricky problem for me to solve here--not just a bug to fix.) Please save your work before running the memory test."
    />
  );
}

export default BetaWarningDialog;