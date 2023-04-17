import path from 'pathe'
import slash from 'slash'

export interface Resolver {
  requestToFile(publicPath: string, root: string): string | undefined
  fileToRequest(filePath: string, root: string): string | undefined
  idToRequest?(id: string): string | undefined
}

export interface InternalResolver {
  requestToFile(publicPath: string): string
  fileToRequest(filePath: string): string
  idToRequest(id: string): string | undefined
}

const defaultPublicToFile = (publicPath: string, root: string) =>
  path.join(root, publicPath.slice(1))

const defaultFileToPublic = (filePath: string, root: string) =>
  `/${slash(path.relative(root, filePath))}`

const defaultIdToRequest = (id: string) => {
  if (id.startsWith('@')) {
    return `/${id}`
  }
}

export function createResolver(
  root: string,
  resolvers: Resolver[]
): InternalResolver {
  return {
    requestToFile: (publicPath) => {
      for (const r of resolvers) {
        const filepath = r.requestToFile(publicPath, root)
        if (filepath) return filepath
      }
      return defaultPublicToFile(publicPath, root)
    },
    fileToRequest: (filePath) => {
      for (const r of resolvers) {
        const request = r.fileToRequest(filePath, root)
        if (request) return request
      }
      return defaultFileToPublic(filePath, root)
    },
    idToRequest: (id) => {
      for (const r of resolvers) {
        const request = r.idToRequest && r.idToRequest(id)
        if (request) return request
      }
      return defaultIdToRequest(id);
    }
  }
}
