import * as React from 'react'

import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogError, DialogContent, DialogFooter } from '../dialog'

import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { startTimer } from '../lib/timing'
import { Ref } from '../lib/ref'
import { RefNameTextBox } from '../lib/ref-name-text-box'
import { enablePreviousTagSuggestions } from '../../lib/feature-flag'

interface ICreateTagProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
  readonly targetCommitSha: string
  readonly initialName?: string
  readonly localTags: Map<string, string> | null
}

interface ICreateTagState {
  readonly tagName: string

  /**
   * Note: once tag creation has been initiated this value stays at true
   * and will never revert to being false. If the tag creation operation
   * fails this dialog will still be dismissed and an error dialog will be
   * shown in its place.
   */
  readonly isCreatingTag: boolean
  readonly previousTags: Array<string> | null
}

const MaxTagNameLength = 245

/** The Create Tag component. */
export class CreateTag extends React.Component<
  ICreateTagProps,
  ICreateTagState
> {
  public constructor(props: ICreateTagProps) {
    super(props)

    this.state = {
      tagName: props.initialName || '',
      isCreatingTag: false,
      previousTags: this.getExistingTagsFiltered(),
    }
  }

  public render() {
    const error = this.getCurrentError()
    const disabled = error !== null || this.state.tagName.length === 0

    return (
      <Dialog
        id="create-tag"
        title={__DARWIN__ ? '创建标签' : '创建标签'}
        onSubmit={this.createTag}
        onDismissed={this.props.onDismissed}
        loading={this.state.isCreatingTag}
        disabled={this.state.isCreatingTag}
      >
        {error && <DialogError>{error}</DialogError>}

        <DialogContent>
          <RefNameTextBox
            label="名称"
            initialValue={this.props.initialName}
            onValueChange={this.updateTagName}
          />

          {this.renderPreviousTags()}
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={__DARWIN__ ? '创建' : '创建'}
            okButtonDisabled={disabled}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private renderPreviousTags() {
    if (!enablePreviousTagSuggestions()) {
      return null
    }

    const { localTags } = this.props
    const { previousTags, tagName } = this.state

    if (previousTags === null || localTags === null || localTags.size === 0) {
      return null
    }

    const title = __DARWIN__ ? '相关标签' : '相关标签'
    const lastThreeTags = previousTags.slice(-3)

    return (
      <>
        <p>{title}</p>
        {lastThreeTags.length === 0 ? (
          <p>{`未找到与 '${tagName}' 相关的标签`}</p>
        ) : (
          lastThreeTags.map((item: string, index: number) => (
            <Ref key={index}>{item}</Ref>
          ))
        )}
      </>
    )
  }

  private getCurrentError(): JSX.Element | null {
    if (this.state.tagName.length > MaxTagNameLength) {
      return <>标签不能超过{MaxTagNameLength}字</>
    }

    const alreadyExists =
      this.props.localTags && this.props.localTags.has(this.state.tagName)
    if (alreadyExists) {
      return (
        <>
          已经存在名称为 <Ref>{this.state.tagName}</Ref> 的标签了
        </>
      )
    }

    return null
  }

  private getExistingTagsFiltered(filter: string = ''): Array<string> | null {
    if (this.props.localTags === null) {
      return null
    }
    const previousTags = Array.from(this.props.localTags.keys())
    return previousTags.filter(item => item.includes(filter))
  }

  private updateTagName = (tagName: string) => {
    this.setState({
      tagName,
      previousTags: this.getExistingTagsFiltered(tagName),
    })
  }

  private createTag = async () => {
    const name = this.state.tagName
    const repository = this.props.repository

    if (name.length > 0) {
      this.setState({ isCreatingTag: true })

      const timer = startTimer('create tag', repository)
      await this.props.dispatcher.createTag(
        repository,
        name,
        this.props.targetCommitSha
      )
      timer.done()

      this.props.onDismissed()
    }
  }
}
