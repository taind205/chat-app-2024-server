import { Types } from "mongoose";

export const userSearch_v2_1_aggPipeline = (searchTerm:string) =>
  [
    {
      '$match': {
        'username': {
          '$in': [
            searchTerm, ''
          ]
        }
      }
    }, {
      '$sort': {
        'username': -1 as -1
      }
    }, {
      '$limit': 1
    }, {
      '$lookup': {
        'from': 'users', 
        'pipeline': [
          {
            '$match': {
              '$or': [
                {
                  '$text': {
                    '$search': searchTerm
                  }
                }
              ]
            }
          }, {
            '$limit': 10
          }
        ], 
        'as': 'users'
      }
    }, {
    '$project': {
      '__v': 0, 
      'users.__v': 0
    }
  }
]

export const search_v2_1_aggPipeline = (searchTerm:string, userId:string) =>
  [
    {
      '$match': {
        'username': {
          '$in': [
            searchTerm, ''
          ]
        }
      }
    }, {
      '$sort': {
        'username': -1 as -1
      }
    }, {
      '$limit': 1
    }, {
      '$lookup': {
        'from': 'users', 
        'pipeline': [
          {
            '$match': {
              '$or': [
                {
                  '$text': {
                    '$search': searchTerm
                  }
                }
              ]
            }
          }, {
            '$limit': 10
          }
        ], 
        'as': 'users'
      }
    }, {
      '$lookup': {
        'from': 'conversations', 
        'pipeline': [
          {
            '$match': {
              'participants.id': new Types.ObjectId(userId), 
              'name': new RegExp(searchTerm, 'i')
            }
          }, {
            '$limit': 5
          }, {
          '$set': {
            'participants': {
              '$slice': [
                '$participants', 3
              ]
            }
          }
        }, {
          '$lookup': {
            'from': 'users', 
            'localField': 'participants.id', 
            'foreignField': '_id', 
            'as': 'users'
          }
        }
      ], 
      'as': 'groups'
    }
  }, {
    '$project': {
      '__v': 0, 
      'groups.users.__v': 0, 
      'groups.__v': 0, 
      'groups.lastMsg': 0, 
      'groups.participants': 0, 
      'users.__v': 0
    }
  }
]