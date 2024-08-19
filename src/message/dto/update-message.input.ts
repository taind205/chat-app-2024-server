export type UpdateMessageInput = 
  {type:'react', data:UserReactInput}
  | {type:'unsend', data:{msgId:string, userId:string, convId:string}}
  | {type:'hide', data:{msgId:string, userId:string, convId:string}}

interface UserReact {
  user:string;
  
  react:string;
}

export interface UserReactInput extends UserReact {
  msgId:string,
  convId:string,
}