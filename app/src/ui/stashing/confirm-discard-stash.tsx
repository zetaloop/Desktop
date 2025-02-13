import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Row } from '../lib/row'
import { IStashEntry } from '../../models/stash-entry'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { Checkbox, CheckboxValue } from '../lib/checkbox'

interface IConfirmDiscardStashProps {
  readonly dispatcher: Dispatcher
  readonly repository: Repository
  readonly stash: IStashEntry
  readonly askForConfirmationOnDiscardStash: boolean
  readonly onDismissed: () => void
}

interface IConfirmDiscardStashState {
  readonly isDiscarding: boolean
  readonly confirmDiscardStash: boolean
}
/**
 * Dialog to confirm dropping a stash
 */
export class ConfirmDiscardStashDialog extends React.Component<
  IConfirmDiscardStashProps,
  IConfirmDiscardStashState
> {
  public constructor(props: IConfirmDiscardStashProps) {
    super(props)

    this.state = {
      isDiscarding: false,
      confirmDiscardStash: props.askForConfirmationOnDiscardStash,
    }
  }

  public render() {
    const title = __DARWIN__ ? '放弃暂存区？' : '放弃暂存区？'

    return (
      <Dialog
        id="discard-stash"
        type="warning"
        title={title}
        loading={this.state.isDiscarding}
        disabled={this.state.isDiscarding}
        onSubmit={this.onSubmit}
        onDismissed={this.props.onDismissed}
        role="alertdialog"
        ariaDescribedBy="discard-stash-warning-message"
      >
        <DialogContent>
          <Row id="discard-stash-warning-message">
            确定要放弃这些暂存的改动吗？
          </Row>
          <Row>
            <Checkbox
              label="不再显示"
              value={
                this.state.confirmDiscardStash
                  ? CheckboxValue.Off
                  : CheckboxValue.On
              }
              onChange={this.onAskForConfirmationOnDiscardStashChanged}
            />
          </Row>
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup destructive={true} okButtonText="确定放弃" />
        </DialogFooter>
      </Dialog>
    )
  }

  private onAskForConfirmationOnDiscardStashChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const value = !event.currentTarget.checked

    this.setState({ confirmDiscardStash: value })
  }

  private onSubmit = async () => {
    const { dispatcher, repository, stash, onDismissed } = this.props

    this.setState({
      isDiscarding: true,
    })

    try {
      dispatcher.setConfirmDiscardStashSetting(this.state.confirmDiscardStash)
      await dispatcher.dropStash(repository, stash)
    } finally {
      this.setState({
        isDiscarding: false,
      })
    }

    onDismissed()
  }
}
