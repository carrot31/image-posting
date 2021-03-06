import { createAction, handleActions } from "redux-actions";
import { produce } from "immer";
import { firestore } from "../../shared/firebase";
import "moment";
import moment from "moment";
import firebase from "firebase/compat/app";
import { actionCreators as postActions } from "../modules/post";

const SET_COMMENT = "SET_COMMENT";
const ADD_COMMENT = "ADD_COMMENT";

const LOADING = "LOADING";

const setComment = createAction(SET_COMMENT, (post_id, comment_list) => ({post_id, comment_list}));
const addComment = createAction(ADD_COMMENT, (post_id, comment) => ({post_id, comment}));

const loading = createAction(LOADING, (is_loading) => ({ is_loading }));

const initialState = {
  list: {},
  is_loading: false,
};

const addCommentFB = (post_id, contents) =>{
    return function (dispatch, getState, {history}){
        const commentDB = firestore.collection('comment')
        const user_info = getState().user.user;

        let comment = {
            post_id: post_id,
            user_id: user_info.uid,
            user_name: user_info.user_name,
            user_profile: user_info.user_profile,
            contents: contents,
            insert_dt: moment().format('YYYY-MM-DD hh:mm:ss')
        }

        commentDB.add(comment).then(doc=>{
            const postDB = firestore.collection('post'); //게시글의 댓글 수도 + 1
            comment = {...comment, id:doc.id};

            const post = getState().post.list.find(l=>l.id===post_id)

            const increment = firebase.firestore.FieldValue.increment(1); //increment안 숫자 만큼 현재 값에서 추가 해줌  

            postDB
            .doc(post_id)
            .update({comment_cnt: increment})
            .then(_post => {
                dispatch(addComment(post_id,comment));

                //내가 가지고 있는 리덕스의 댓글 개수 + 1
                if(post){
                    dispatch(
                        postActions.editPostFB(post_id,{
                            comment_cnt: parseInt(post.comment_cnt)+1, //포스트 하나에 대한 수정 
                        })
                    );
                }
            }) 
        })
    }
}

const getCommentFB = (post_id = null) => {
    return function (dispatch, getState, { history }) {
      const commentDB = firestore.collection("comment");
          
          // post_id가 없으면 바로 리턴하기!
      if(!post_id){
          return;
      }
  
      // where로 게시글 id가 같은 걸 찾고,
      // orderBy로 정렬해줍니다.
      commentDB
        .where("post_id", "==", post_id)
        .orderBy("insert_dt", "desc")
        .get()
        .then((docs) => {
          let list = [];
          docs.forEach((doc) => {
            list.push({ ...doc.data(), id: doc.id });
          });
          //   가져온 데이터를 넣어주자!
          dispatch(setComment(post_id, list));
        }).catch(err => {
            console.log("댓글 가져오기 실패!", post_id, err);
        });
    };
  };

export default handleActions(
  {
      [SET_COMMENT]: (state, action) => produce(state, (draft) => {
        draft.list[action.payload.post_id] = action.payload.comment_list; //방을 만들어서 post_id만 있다면 다 가져오도록 
      }),
      [ADD_COMMENT]: (state, action) => produce(state, (draft) => {
        draft.list[action.payload.post_id].unshift(action.payload.comment);
    }),
      [LOADING]: (state, action) => 
      produce(state, (draft) => {
        draft.is_loading = action.payload.is_loading;
      })
  },
  initialState
);

const actionCreators = {
  addCommentFB,
  getCommentFB,
  setComment,
  addComment,
};

export { actionCreators };