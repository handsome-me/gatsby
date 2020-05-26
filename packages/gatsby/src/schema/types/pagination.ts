import {
  SchemaComposer,
  ObjectTypeComposer,
  InputTypeComposer,
  InterfaceTypeComposer,
  ComposeFieldConfigMap
} from "graphql-compose"
import { getFieldsEnum } from "./sort"
import { addDerivedType } from "./derived-types"
import { distinct, group } from "../resolvers"

export const getPageInfo = <TContext = any>({
  schemaComposer
}: {
  schemaComposer: SchemaComposer<TContext>
}): ObjectTypeComposer =>
  schemaComposer.getOrCreateOTC(`PageInfo`, tc => {
    tc.addFields({
      currentPage: `Int!`,
      hasPreviousPage: `Boolean!`,
      hasNextPage: `Boolean!`,
      itemCount: `Int!`,
      pageCount: `Int!`,
      perPage: `Int`
    })
  })

export const getEdge = <TContext = any>({
  schemaComposer,
  typeComposer
}: {
  schemaComposer: SchemaComposer<TContext>
  typeComposer: ObjectTypeComposer | InterfaceTypeComposer
}): ObjectTypeComposer => {
  const typeName = `${typeComposer.getTypeName()}Edge`
  addDerivedType({ typeComposer, derivedTypeName: typeName })
  return schemaComposer.getOrCreateOTC(typeName, tc => {
    tc.addFields({
      next: typeComposer,
      node: typeComposer.getTypeNonNull(),
      previous: typeComposer
    })
  })
}

const createPagination = <TSource = any, TContext = any>({
  schemaComposer,
  typeComposer,
  fields,
  typeName
}: {
  schemaComposer: SchemaComposer<TContext>
  typeComposer: ObjectTypeComposer | InterfaceTypeComposer
  fields: ComposeFieldConfigMap<TSource, TContext>
  typeName: string
}): ObjectTypeComposer => {
  const paginationTypeComposer: ObjectTypeComposer = schemaComposer.getOrCreateOTC(
    typeName,
    tc => {
      tc.addFields({
        totalCount: `Int!`,
        edges: [getEdge({ schemaComposer, typeComposer }).getTypeNonNull()],
        nodes: [typeComposer.getTypeNonNull()],
        pageInfo: getPageInfo({ schemaComposer }).getTypeNonNull(),
        ...fields
      })
    }
  )
  paginationTypeComposer.makeFieldNonNull(`edges`)
  paginationTypeComposer.makeFieldNonNull(`nodes`)
  addDerivedType({ typeComposer, derivedTypeName: typeName })
  return paginationTypeComposer
}

export const getGroup = <TContext = any>({
  schemaComposer,
  typeComposer
}: {
  schemaComposer: SchemaComposer<TContext>
  typeComposer: ObjectTypeComposer | InterfaceTypeComposer
}): ObjectTypeComposer => {
  const typeName = `${typeComposer.getTypeName()}GroupConnection`
  const fields = {
    field: `String!`,
    fieldValue: `String`
  }
  return createPagination({ schemaComposer, typeComposer, fields, typeName })
}

export const getPagination = <TContext = any>({
  schemaComposer,
  typeComposer
}: {
  schemaComposer: SchemaComposer<TContext>
  typeComposer: ObjectTypeComposer | InterfaceTypeComposer
}): ObjectTypeComposer => {
  const inputTypeComposer: InputTypeComposer = typeComposer.getInputTypeComposer()
  const typeName = `${typeComposer.getTypeName()}Connection`
  const fieldsEnumTC = getFieldsEnum({
    schemaComposer,
    typeComposer,
    inputTypeComposer
  })
  const fields = {
    distinct: {
      type: [`String!`],
      args: {
        field: fieldsEnumTC.getTypeNonNull()
      },
      resolve: distinct
    },
    group: {
      type: [getGroup({ schemaComposer, typeComposer }).getTypeNonNull()],
      args: {
        skip: `Int`,
        limit: `Int`,
        field: fieldsEnumTC.getTypeNonNull()
      },
      resolve: group
    }
  }
  const paginationTypeComposer: ObjectTypeComposer = createPagination({
    schemaComposer,
    typeComposer,
    fields,
    typeName
  })
  paginationTypeComposer.makeFieldNonNull(`distinct`)
  paginationTypeComposer.makeFieldNonNull(`group`)
  return paginationTypeComposer
}