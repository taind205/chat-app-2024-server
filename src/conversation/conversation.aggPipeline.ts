import { Types } from "mongoose";
import { ObjectIdLike } from "typeorm/driver/mongodb/bson.typings";
const ObjectId = Types.ObjectId;

export const getLatestConvs_v3_Pipeline = ({userId,lastMsgPos,num}:{userId:string, lastMsgPos?:string|ObjectIdLike,num?:number}) =>
    [
  {
    '$match': lastMsgPos?{
      'participants.id': new ObjectId(userId),
      'lastMsg':{'$lt': new ObjectId(lastMsgPos)}
    }:{'participants.id': new ObjectId(userId)}
  }, {
    '$sort': {
      'lastMsg': -1 as -1
    }
  }, {
    '$limit': num || 10
  }, {
    '$lookup': {
      'from': 'messages', 
      'localField': '_id', 
      'foreignField': 'conv', 
      'as': 'unread', 
      'let': {
        'userSeenMsg': {
          '$getField': {
            'field': 'seenMsg', 
            'input': {
              '$arrayElemAt': [
                {
                  '$filter': {
                    'input': '$participants', 
                    'as': 'p', 
                    'cond': {
                      '$eq': [
                        '$$p.id', new ObjectId(userId)
                      ]
                    }, 
                    'limit': 1
                  }
                }, 0
              ]
            }
          }
        }
      }, 
      'pipeline': [
        {
          '$match': {
            '$expr': {
              '$gt': [
                '$_id', '$$userSeenMsg'
              ]
            }
          }
        }, {
          '$count': 'num'
        }
      ]
    }
  }, {
    '$set': {
      'unread': {
        '$getField': {
          'field': 'num', 
          'input': {
            '$arrayElemAt': [
              '$unread', 0
            ]
          }
        }
      }
    }
  }, {
    '$lookup': {
      'from': 'messages', 
      'localField': '_id', 
      'foreignField': 'conv', 
      'as': 'lastMsgData', 
      'pipeline': [
        {
          '$match': {
            'userHide': {
              '$ne': new ObjectId(userId)
            }
          }
        }, {
          '$sort': {
            '_id': -1 as -1
          }
        }, {
          '$limit': 1
        }
      ]
    }
  }, {
    '$unwind': {
      'path': '$lastMsgData', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$project': {
      '__v': 0, 
      'lastMsg.conv': 0, 
      'lastMsg.__v': 0
    }
  }
]

export const getConvWithLastMsg_AggPl_v4 = ({address,userId}:{address:string|string[], userId:string}) => [
  {
    '$match': Array.isArray(address)?
    {
      'participants.id': {
        '$all': [
          new ObjectId(address[0]), new ObjectId(address[1])
        ]
      }, 
      'type': undefined
    }:{
      '_id': new ObjectId(address),
      'participants.id': new ObjectId(userId)
    }
  }, {
    '$lookup': {
      'from': 'messages', 
      'localField': '_id', 
      'foreignField': 'conv', 
      'as': 'messages', 
      'pipeline': [
        {
          '$match': {
            'userHide': {
              '$ne': new ObjectId(userId)
            }
          }
        }, {
          '$sort': {
            '_id': -1 as -1
          }
        }, {
          '$limit': 10
        }, {
          '$lookup': {
            'from': 'messages', 
            'localField': 'repMsg', 
            'foreignField': '_id', 
            'as': 'repMsg',
            'pipeline':[
              {
                '$match': {
                  'userHide': {
                    '$ne': new ObjectId(userId)
                  }
                }
              },
            ]
          }
        }, {
          '$unwind': {
            'path': '$repMsg', 
            'preserveNullAndEmptyArrays': true
          }
        }, {
          '$project': {
            '__v': 0, 
            'conv': 0, 
            'repMsg.__v': 0, 
            'repMsg.conv': 0
          }
        }
      ]
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'localField': 'participants.id', 
      'foreignField': '_id', 
      'as': 'users'
    }
  },{
    '$project': {
      '__v': 0, 
      'users.__v': 0,
      'lastMsg':0,
    }
  }
]

export const getGroupChatIds = (uid:string) => [
  {
    '$match': {
      'participants.id': new ObjectId(uid), 
      'type': 'g'
    }
  }, {
    '$project': {
      '_id': 1
    }
  }
]

export const getOneMsg_Auth = ({convId,userId,msgId}:{convId:string,userId:string,msgId:string}) => [
    {
      '$match': {
        '_id': new ObjectId(convId),
        'participants.id': new ObjectId(userId), 
      }
    }, {
      '$lookup': {
        'from': 'messages', 
        'localField': '_id', 
        'foreignField': 'conv', 
        'as': 'msg', 
        'pipeline': [
          {
            '$match': {
              '_id': new ObjectId(msgId), 
              'userHide': {
                '$ne': new ObjectId(userId)
              }
            }
          }
        ]
      }
    }
  ]

export const getMoreMsg_Auth_AggPl_v4 = ({convId, userId, msgIdPos}:{convId:string, userId:string, msgIdPos?:string}) => [
  {
    '$project': {
      '_id': 1, 
      'participants.id': 1,
    }
  }, {
    '$match': {
      '_id': new ObjectId(convId), 
      'participants.id': new ObjectId(userId)
    }
  }, {
    '$lookup': {
      'from': 'messages', 
      'localField': '_id', 
      'foreignField': 'conv', 
      'as': 'messages', 
      'pipeline': [
        {
          '$match': {
            '_id': {
              '$lt': new ObjectId(msgIdPos)
            }, 
            'userHide': {
              '$ne': new ObjectId(userId)
            }
          }
        }, {
          '$sort': {
            '_id': -1 as -1
          }
        }, {
          '$limit': 10
        }, {
          '$lookup': {
            'from': 'messages', 
            'localField': 'repMsg', 
            'foreignField': '_id', 
            'as': 'repMsg', 
            'pipeline': [
              {
                '$match': {
                  'userHide': {
                    '$ne': new ObjectId(userId)
                  }
                }
              }
            ]
          }
        }, {
          '$unwind': {
            'path': '$repMsg', 
            'preserveNullAndEmptyArrays': true
          }
        }, {
          '$project': {
            'conv': 0, 
            '__v': 0, 
            'repMsg.conv': 0, 
            'repMsg.__v': 0, 
            'repMsg.react': 0, 
            'repMsg.repMsg': 0
          }
        }
      ]
    }
  }
]
  
export const getMediaMsg_Auth_AggPl = ({convId, userId, msgIdPos}:{convId:string, userId:string, msgIdPos?:string}) => [
  {
    '$project': {
      '_id': 1, 
      'participants.id': 1,
    }
  }, {
    '$match': {
      '_id': new ObjectId(convId), 
      'participants.id': new ObjectId(userId)
    }
  }, {
    '$lookup': {
      'from': 'messages', 
      'localField': '_id', 
      'foreignField': 'conv', 
      'as': 'messages', 
      'pipeline': [
        {
          '$match': {
            ...msgIdPos?{
            '_id': {
              '$lt': new ObjectId(msgIdPos)
            }}:{}, 
            'media': {
              '$exists': true
            }, 
            'userHide': {
              '$ne': new ObjectId(userId)
            }
          }
        }, {
          '$sort': {
            '_id': -1 as -1
          }
        }, {
          '$limit': 20
        }, {
          '$project': {
            'conv': 0, 
            '__v': 0
          }
        }
      ]
    }
  }
]

export const getLatestConvs_Absolutely_Pipeline = ({userId,convLMP,absLMP}:{userId:string, convLMP?:string|ObjectIdLike,absLMP?:string|ObjectIdLike}) =>
  [
  {
    '$match': convLMP?{
      'participants.id': new ObjectId(userId),
      'lastMsg':{'$lt': new ObjectId(convLMP)}
    }:{'participants.id': new ObjectId(userId)}
  }, {
    '$lookup': {
      'from': 'messages', 
      'localField': '_id', 
      'foreignField': 'conv', 
      'as': 'lastMsgData', 
      'pipeline': [
        {
          '$match': {
            'userHide': {
              '$ne': new ObjectId(userId)
            }
          }
        }, {
          '$sort': {
            '_id': -1 as -1
          }
        }, {
          '$limit': 1
        }
      ]
    }
  }, {
    '$unwind': {
      'path': '$lastMsgData', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$match': {
      'lastMsgData._id': {
        '$lt': new ObjectId(absLMP)
      }
    }
  }, {
    '$sort': {
      'lastMsgData._id': -1 as -1
    }
  }, {
    '$limit': 30
  }, {
    '$lookup': {
      'from': 'messages', 
      'localField': '_id', 
      'foreignField': 'conv', 
      'as': 'unread', 
      'let': {
        'userSeenMsg': {
          '$getField': {
            'field': 'seenMsg', 
            'input': {
              '$arrayElemAt': [
                {
                  '$filter': {
                    'input': '$participants', 
                    'as': 'p', 
                    'cond': {
                      '$eq': [
                        '$$p.id', new ObjectId(userId)
                      ]
                    }, 
                    'limit': 1
                  }
                }, 0
              ]
            }
          }
        }
      }, 
      'pipeline': [
        {
          '$match': {
            '$expr': {
              '$gt': [
                '$_id', '$$userSeenMsg'
              ]
            }
          }
        }, {
          '$count': 'num'
        }
      ]
    }
  }, {
    '$set': {
      'unread': {
        '$getField': {
          'field': 'num', 
          'input': {
            '$arrayElemAt': [
              '$unread', 0
            ]
          }
        }
      }
    }
  }, {
    '$project': {
      '__v': 0, 
      'lastMsg.conv': 0, 
      'lastMsg.__v': 0
    }
  }
]

export const updateConv_AdminAuth_Pipeline = ({userOid,convOid,img,name}:{userOid:Types.ObjectId,convOid:Types.ObjectId, img?:string,name?:string}) => [
  {
    '$match': {
      '_id': convOid, 
      'type': 'g'
    }
  }, {
    '$unwind': {
      'path': '$participants'
    }
  }, {
    '$match': {
      'participants.id': userOid, 
      'participants.role': 'admin'
    }
  }, {
    '$project': img?{ 
      'img': img
    }: name?{
      'name': name
    }:{}
  }, {
    '$merge': {
        into: "conversations",
        on: "_id",
        whenMatched: "merge" as "merge",
        whenNotMatched: "fail" as "fail"
      }
  }
]

export const getConvAdminRole_Pipeline = ({userOid,convOid}:{userOid:Types.ObjectId,convOid:Types.ObjectId}) =>[
  {
    '$project': {
      '_id': 1, 
      'type': 1, 
      'participants': 1
    }
  }, {
    '$match': {
      '_id': convOid, 
      'type': 'g'
    }
  }, {
    '$unwind': {
      'path': '$participants'
    }
  }, {
    '$match': {
      'participants.id': userOid, 
      'participants.role': 'admin'
    }
  }
] 

export const getAdminRole_CheckTargetExist = ({userOid,convOid,targetUserOid}:{userOid:Types.ObjectId,convOid:Types.ObjectId,targetUserOid:Types.ObjectId}) => [
  {
    '$project': {
      '_id': 1, 
      'type': 1, 
      'participants': 1
    }
  }, {
    '$match': {
      '_id': convOid, 
      'type': 'g'
    }
  }, {
    '$unwind': {
      'path': '$participants'
    }
  }, {
    '$match': {
      '$or': [
        {
          'participants.id': userOid, 
          'participants.role': 'admin'
        }, {
          'participants.id': targetUserOid
        }
      ]
    }
  }
]