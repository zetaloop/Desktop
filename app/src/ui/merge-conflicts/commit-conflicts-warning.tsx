import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { ICommitContext } from '../../models/commit'
import { WorkingDirectoryFileChange } from '../../models/status'
import { PathText } from '../lib/path-text'
import { DefaultCommitMessage } from '../../models/commit-message'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'

interface ICommitConflictsWarningProps {
  readonly dispatcher: Dispatcher
  /** files that were selected for committing that are also conflicted */
  readonly files: ReadonlyArray<WorkingDirectoryFileChange>
  /** repository user is committing in */
  readonly repository: Repository
  /** information for completing the commit */
  readonly context: ICommitContext
  readonly onDismissed: () => void
}

/**
 * Modal to tell the user their merge encountered conflicts
 */
export class CommitConflictsWarning extends React.Component<
  ICommitConflictsWarningProps,
  {}
> {
  private onCancel = () => {
    this.props.onDismissed()
  }

  private onSubmit = async () => {
    this.props.onDismissed()
    await this.props.dispatcher.commitIncludedChanges(
      this.props.repository,
      this.props.context
    )
    this.props.dispatcher.clearBanner()
    this.props.dispatcher.setCommitMessage(
      this.props.repository,
      DefaultCommitMessage
    )
  }

  private renderFiles(files: ReadonlyArray<WorkingDirectoryFileChange>) {
    return (
      <div className="conflicted-files-text">
        <ul>
          {files.map(f => (
            <li key={f.path}>
              <PathText path={f.path} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  public render() {
    return (
      <Dialog
        id="commit-conflict-markers-warning"
        onDismissed={this.onCancel}
        onSubmit={this.onSubmit}
        title={'确定提交冲突文件'}
        type={'warning'}
      >
        <DialogContent>
          <p>若继续提交，您将会把以下有冲突的文件提交进仓库：</p>
          {this.renderFiles(this.props.files)}
          <p>确定要提交这些有冲突的文件吗？</p>
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            destructive={true}
            okButtonText={__DARWIN__ ? '确定提交文件' : '确定提交文件'}
          />
        </DialogFooter>
      </Dialog>
    )
  }
}
