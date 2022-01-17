const EntitySchema = require('typeorm').EntitySchema

module.exports = new EntitySchema({
  name: 'SnailLog',
  tableName: 'snail_logs',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    processId: {
      type: 'varchar',
      nullable: true,
    },
    H: {
      type: 'varchar',
    },
    U: {
      type: 'varchar',
    },
    D: {
      type: 'varchar',
    },
    F: {
      type: 'varchar',
    },
    result: {
      type: 'varchar',
    },
    day: {
      type: 'varchar',
    },
    date: {
      type: 'timestamp',
    },
    created_at: {
      type: 'timestamp',
      createDate: true,
      updateDate: false,
    },
    updated_at: {
      type: 'timestamp',
      createDate: false,
      updateDate: true,
    },
  },
  //snaillog belongs to a user and a user has many snaillogs
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      inverseSide: 'snailLogs',
      joinColumn: true,
    },
  },
})
