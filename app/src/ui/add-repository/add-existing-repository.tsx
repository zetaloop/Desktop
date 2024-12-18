import * as React from 'react'
import * as Path from 'path'
import { Dispatcher } from '../dispatcher'
import { addSafeDirectory, getRepositoryType } from '../../lib/git'
import { Button } from '../lib/button'
import { TextBox } from '../lib/text-box'
import { Row } from '../lib/row'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { LinkButton } from '../lib/link-button'
import { PopupType } from '../../models/popup'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { FoldoutType } from '../../lib/app-state'

import untildify from 'untildify'
import { showOpenDialog } from '../main-process-proxy'
import { Ref } from '../lib/ref'
import { InputError } from '../lib/input-description/input-error'
import { IAccessibleMessage } from '../../models/accessible-message'

interface IAddExistingRepositoryProps {
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void

  /** An optional path to prefill the path text box with.
   * Defaults to the empty string if not defined.
   */
  readonly path?: string
}

interface IAddExistingRepositoryState {
  readonly path: string

  /**
   * Indicates whether or not to render a warning message about the entered path
   * not containing a valid Git repository. This value differs from `isGitRepository` in that it holds
   * its value when the path changes until we've gotten a definitive answer from the asynchronous
   * method that the path is, or isn't, a valid repository path. Separating the two means that
   * we don't toggle visibility of the warning message until it's really necessary, preventing
   * flickering for our users as they type in a path.
   */
  readonly showNonGitRepositoryWarning: boolean
  readonly isRepositoryBare: boolean
  readonly isRepositoryUnsafe: boolean
  readonly repositoryUnsafePath?: string
  readonly isTrustingRepository: boolean
}

/** The component for adding an existing local repository. */
export class AddExistingRepository extends React.Component<
  IAddExistingRepositoryProps,
  IAddExistingRepositoryState
> {
  private pathTextBoxRef = React.createRef<TextBox>()

  public constructor(props: IAddExistingRepositoryProps) {
    super(props)

    const path = this.props.path ? this.props.path : ''

    this.state = {
      path,
      showNonGitRepositoryWarning: false,
      isRepositoryBare: false,
      isRepositoryUnsafe: false,
      isTrustingRepository: false,
    }
  }

  private onTrustDirectory = async () => {
    this.setState({ isTrustingRepository: true })
    const { repositoryUnsafePath, path } = this.state
    if (repositoryUnsafePath) {
      await addSafeDirectory(repositoryUnsafePath)
    }
    await this.validatePath(path)
    this.setState({ isTrustingRepository: false })
  }

  private async updatePath(path: string) {
    this.setState({ path })
  }

  private async validatePath(path: string): Promise<boolean> {
    if (path.length === 0) {
      this.setState({
        isRepositoryBare: false,
        showNonGitRepositoryWarning: false,
      })
      return false
    }

    const type = await getRepositoryType(path)

    const isRepository = type.kind !== 'missing' && type.kind !== 'unsafe'
    const isRepositoryUnsafe = type.kind === 'unsafe'
    const isRepositoryBare = type.kind === 'bare'
    const showNonGitRepositoryWarning = !isRepository || isRepositoryBare
    const repositoryUnsafePath = type.kind === 'unsafe' ? type.path : undefined

    this.setState(state =>
      path === state.path
        ? {
            isRepositoryBare,
            isRepositoryUnsafe,
            showNonGitRepositoryWarning,
            repositoryUnsafePath,
          }
        : null
    )

    return path.length > 0 && isRepository && !isRepositoryBare
  }

  private buildBareRepositoryError() {
    if (
      !this.state.path.length ||
      !this.state.showNonGitRepositoryWarning ||
      !this.state.isRepositoryBare
    ) {
      return null
    }

    const msg =
      '该文件夹是一个裸仓库，也就是只有版本控制记录，而没有具体的文件。目前不支持裸仓库。'

    return { screenReaderMessage: msg, displayedMessage: msg }
  }

  private buildRepositoryUnsafeError() {
    const { repositoryUnsafePath, path } = this.state
    if (
      !this.state.path.length ||
      !this.state.showNonGitRepositoryWarning ||
      !this.state.isRepositoryUnsafe ||
      repositoryUnsafePath === undefined
    ) {
      return null
    }

    // Git for Windows will replace backslashes with slashes in the error
    // message so we'll do the same to not show "the repo at path c:/repo"
    // when the entered path is `c:\repo`.
    const convertedPath = __WIN32__ ? path.replaceAll('\\', '/') : path

    const displayedMessage = (
      <>
        <p>
          这个
          {repositoryUnsafePath !== convertedPath && (
            <>
              位于 <Ref>{repositoryUnsafePath}</Ref> 的
            </>
          )}
          仓库属于您电脑上的其他用户。添加一个不安全的仓库可能会让其中的未知文件被自动运行。
        </p>
        <p>
          如果您确定该仓库是安全的，可以{' '}
          <LinkButton onClick={this.onTrustDirectory}>
            把文件夹添加到信任列表
          </LinkButton>
          ，以便继续操作。
        </p>
      </>
    )

    const screenReaderMessage = `该仓库属于您电脑上的其他用户。添加一个不安全的仓库可能会让其中的未知文件被自动运行。
      如果您确定该仓库是安全的，可以把文件夹添加到信任列表，以便继续操作。`

    return { screenReaderMessage, displayedMessage }
  }

  private buildNotAGitRepositoryError(): IAccessibleMessage | null {
    if (!this.state.path.length || !this.state.showNonGitRepositoryWarning) {
      return null
    }

    const displayedMessage = (
      <>
        <p>该文件夹不是 Git 仓库。</p>
        <p>
          是否需要在这里{' '}
          <LinkButton onClick={this.onCreateRepositoryClicked}>
            创建仓库
          </LinkButton>{' '}
          ？
        </p>
      </>
    )

    const screenReaderMessage =
      '该文件夹不是 Git 仓库。是否需要在这里创建仓库？'

    return { screenReaderMessage, displayedMessage }
  }

  private renderErrors() {
    const msg: IAccessibleMessage | null =
      this.buildBareRepositoryError() ??
      this.buildRepositoryUnsafeError() ??
      this.buildNotAGitRepositoryError()

    if (msg === null) {
      return null
    }

    return (
      <Row>
        <InputError
          id="add-existing-repository-path-error"
          ariaLiveMessage={msg.screenReaderMessage}
        >
          {msg.displayedMessage}
        </InputError>
      </Row>
    )
  }

  public render() {
    return (
      <Dialog
        id="add-existing-repository"
        title={__DARWIN__ ? '添加本地仓库' : '添加本地仓库'}
        onSubmit={this.addRepository}
        onDismissed={this.props.onDismissed}
        loading={this.state.isTrustingRepository}
      >
        <DialogContent>
          <Row>
            <TextBox
              ref={this.pathTextBoxRef}
              value={this.state.path}
              label={__DARWIN__ ? '文件夹路径' : '文件夹路径'}
              placeholder="仓库的位置"
              onValueChanged={this.onPathChanged}
              ariaDescribedBy="add-existing-repository-path-error"
            />
            <Button onClick={this.showFilePicker}>选择…</Button>
          </Row>
          {this.renderErrors()}
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup okButtonText={__DARWIN__ ? '添加' : '添加'} />
        </DialogFooter>
      </Dialog>
    )
  }

  private onPathChanged = async (path: string) => {
    if (this.state.path !== path) {
      this.updatePath(path)
    }
  }

  private showFilePicker = async () => {
    const path = await showOpenDialog({
      properties: ['createDirectory', 'openDirectory'],
    })

    if (path === null) {
      return
    }

    this.updatePath(path)
  }

  private resolvedPath(path: string): string {
    return Path.resolve('/', untildify(path))
  }

  private addRepository = async () => {
    const { path } = this.state
    const isValidPath = await this.validatePath(path)

    if (!isValidPath) {
      this.pathTextBoxRef.current?.focus()
      return
    }

    this.props.onDismissed()
    const { dispatcher } = this.props

    const resolvedPath = this.resolvedPath(path)
    const repositories = await dispatcher.addRepositories([resolvedPath])

    if (repositories.length > 0) {
      dispatcher.closeFoldout(FoldoutType.Repository)
      dispatcher.selectRepository(repositories[0])
      dispatcher.recordAddExistingRepository()
    }
  }

  private onCreateRepositoryClicked = () => {
    this.props.onDismissed()

    const resolvedPath = this.resolvedPath(this.state.path)

    return this.props.dispatcher.showPopup({
      type: PopupType.CreateRepository,
      path: resolvedPath,
    })
  }
}
