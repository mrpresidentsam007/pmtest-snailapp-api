const EntitySchema = require('typeorm').EntitySchema

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    githubId: {
      type: 'varchar',
      nullable: true,
    },
    twitterId: {
      type: 'varchar',
      nullable: true,
    },
    googleId: {
      type: 'varchar',
      nullable: true,
    },
    name: {
      type: 'varchar',
    },
    email: {
      type: 'varchar',
      unique: true,
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
  //user has many snail_logs and snail_log belongs to a user
  relations: {
    snailLogs: {
      type: 'one-to-many',
      target: 'SnailLog',
      inverseSide: 'user',
      joinColumn: true,
    },
  },
})
