import { useState, type FormEvent } from "react";

type WorkspaceCreationDialogProps = {
  onCreate: (name: string) => void;
  onCancel: () => void;
};

export default function WorkspaceCreationDialog({
  onCreate,
  onCancel,
}: WorkspaceCreationDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a workspace name to continue.");
      return;
    }
    onCreate(trimmedName);
  };

  return (
    <div className="workspace-setup">
      <div className="workspace-modal-backdrop">
        <section
          className="workspace-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-modal-title"
        >
          <p className="eyebrow">NEW WORKSPACE</p>
          <h1 id="workspace-modal-title">What should we call it?</h1>
          <p className="workspace-modal__copy">
            Give your design space a name. You can start with a blank canvas.
          </p>
          <form onSubmit={handleSubmit}>
            <label className="workspace-modal__field">
              <span>Workspace name</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. LLD Practice"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "workspace-name-error" : undefined}
              />
            </label>
            {error && (
              <p className="workspace-modal__error" id="workspace-name-error">
                {error}
              </p>
            )}
            <div className="workspace-modal__actions">
              <button
                className="workspace-modal__cancel"
                type="button"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button className="workspace-modal__create" type="submit">
                Create workspace
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
