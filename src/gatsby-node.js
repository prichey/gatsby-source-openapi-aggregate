const crypto = require('crypto')
const omit = require('lodash.omit')
const { loggerFactory } = require('./logger-factory')
const { getSpecs } = require('./get-specs')
const { specValidator } = require('./validators/spec-validator')

const toHash = value => {
  return crypto
    .createHash(`md5`)
    .update(value)
    .digest(`hex`)
}

const toNode = (data, type) => {
  const openApiPrefix = 'openapi.'

  if (!data) {
    throw new Error('No data object specified')
  }

  if (!type) {
    throw new Error('No type specified')
  }

  if (!data.hasOwnProperty('id')) {
    throw new Error('Data object has no id property')
  }

  if (!data.hasOwnProperty('parent')) {
    throw new Error('Data object has no parent property')
  }

  if (!data.hasOwnProperty('children') || !Array.isArray(data.children)) {
    throw new Error('Data object has no children array property')
  }

  if (data.hasOwnProperty('fields') && data.hasOwnProperty('meta')) {
    throw new Error('Data object defines both a fields and a meta property')
  }

  if (!data.hasOwnProperty('fields') && !data.hasOwnProperty('meta')) {
    throw new Error('Data object does not define a fields or meta property')
  }

  const node = Object.assign(
    {
      id: `${openApiPrefix}${data.id}`,
      parent: data.parent ? `${openApiPrefix}${data.parent}` : null,
      children: data.children.map(c => `${openApiPrefix}${c}`),
      internal: {
        type,
      },
    },
    data.fields
  )

  if (data.meta) {
    node.internal.contentDigest = toHash(data.meta.content)
    node.internal.mediaType = data.meta.mediaType
    node.internal.content = data.meta.content
    return node
  }

  node.internal.contentDigest = toHash(JSON.stringify(data.fields))
  return node
}

const createNodes = (specs, createNode) => {
  // { information, paths, responses, definitions }
  specs.forEach(spec => {
    const nodes = []
    nodes.push(toNode(spec.information, 'OpenApiSpec'))
    spec.paths.forEach(p => {
      nodes.push(toNode(p, 'OpenApiSpecPath'))
    })
    spec.responses.forEach(r => {
      nodes.push(toNode(r, 'OpenApiSpecResponse'))
    })
    spec.definitions.forEach(d => {
      nodes.push(toNode(d, 'OpenApiSpecDefinition'))
    })

    nodes.forEach(n => {
      createNode(n)
    })
  })
}

const validateSpecs = specs => {
  specs.forEach(spec => {
    const result = specValidator(spec)
    if (!result.isValid) {
      const errors = result.errors.map(
        e => `name: ${e.name}, error: ${e.messages.join(',')}\n`
      )
      const message = `There are errors with the ${spec.name} spec.\n${errors.join(
        '\n'
      )}`
      throw new Error(message)
    }
  })
}

const getNodeDefinitions = specs => {
  specs.forEach(spec => {
    const rootId = `spec.${spec.name}`
  })

  return []
}

const getNodes = specs => {
  return []
}

exports.sourceNodes = async ({ boundActionCreators, reporter }, options) => {
  const { createNode } = boundActionCreators

  const cleanedOptions = omit(options, 'plugins')

  const specs = await getSpecs(cleanedOptions, loggerFactory(reporter))
  const specsToProcess = specs.filter(s => s)
  validateSpecs(specsToProcess)

  // const nodeDefinitions = getNodeDefinitions(specsToProcess)
  // const nodes = getNodes(nodeDefinitions)

  // nodes.forEach(node => {
  //   createNode(node)
  // })
}
