import * as React from 'react'

import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { WorkingDirectoryFileChange } from '../../models/status'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { PathText } from '../lib/path-text'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { ITextDiff, DiffSelection } from '../../models/diff'

interface IDiscardSelectionProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  /**
   * The file where the selection of changes to discard should be applied.
   */
  readonly file: WorkingDirectoryFileChange
  /**
   * The current diff with the local changes for that file.
   */
  readonly diff: ITextDiff
  /**
   * The selection (based on the passed diff) of changes to discard.
   */
  readonly selection: DiffSelection
  /**
   * Function called when the user either dismisses the dialog or
   * the discard operation finishes.
   */
  readonly onDismissed: () => void
}

interface IDiscardSelectionState {
  /**
   * Whether or not we're currently in the process of discarding
   * changes. This is used to display a loading state
   */
  readonly isDiscardingSelection: boolean
  /**
   * Whether or not the "do not show this message again" checkbox
   * is checked.
   */
  readonly confirmDiscardSelection: boolean
}

/** A component to confirm and then discard changes from a selection. */
export class DiscardSelection extends React.Component<
  IDiscardSelectionProps,
  IDiscardSelectionState
> {
  public constructor(props: IDiscardSelectionProps) {
    super(props)

    this.state = {
      isDiscardingSelection: false,
      confirmDiscardSelection: true,
    }
  }

  private getOkButtonLabel() {
    return __DARWIN__ ? '放弃改动' : '放弃改动'
  }

  public render() {
    const isDiscardingChanges = this.state.isDiscardingSelection

    return (
      <Dialog
        id="discard-changes"
        title={__DARWIN__ ? '放弃改动' : '放弃改动'}
        onDismissed={this.props.onDismissed}
        onSubmit={this.discard}
        dismissDisabled={isDiscardingChanges}
        loading={isDiscardingChanges}
        disabled={isDiscardingChanges}
        type="warning"
      >
        <DialogContent>
          <p>您确定要放弃对以下文件的改动吗：</p>

          <ul>
            <li>
              <PathText path={this.props.file.path} />
            </li>
          </ul>

          <Checkbox
            label="不再显示"
            value={
              this.state.confirmDiscardSelection
                ? CheckboxValue.Off
                : CheckboxValue.On
            }
            onChange={this.onConfirmDiscardSelectionChanged}
          />
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            destructive={true}
            okButtonText={this.getOkButtonLabel()}
            okButtonDisabled={isDiscardingChanges}
            cancelButtonDisabled={isDiscardingChanges}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private discard = async () => {
    this.setState({ isDiscardingSelection: true })

    await this.props.dispatcher.discardChangesFromSelection(
      this.props.repository,
      this.props.file.path,
      this.props.diff,
      this.props.selection
    )
    this.props.dispatcher.setConfirmDiscardChangesSetting(
      this.state.confirmDiscardSelection
    )
    this.props.onDismissed()
  }

  private onConfirmDiscardSelectionChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const value = !event.currentTarget.checked

    this.setState({ confirmDiscardSelection: value })
  }
}
