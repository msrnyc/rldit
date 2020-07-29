function getPostList() {
    return Array.from(document.getElementById('siteTable').children).filter(x => x.classList.contains('thing'));
}

let __pageEventId = null;

function promote_best_post(best_slot) {
    try {
        console.log(`RLDIT promoting slot ${best_slot}`);
        if(best_slot == 0) {
            console.log("best slot already to slot. bye");
            return;
        }

        let siteTable = document.getElementById('siteTable');
        let posts = getPostList();

        var tmp = posts[best_slot];
        posts[best_slot] = posts[0];
        posts[0] = tmp;

        const frag = document.createDocumentFragment();
        var j = 0;
        var orig = Array.from(siteTable.children);
        siteTable.innerHTML = '';

        for(var i = 0; i < orig.length; ++i) {
            var node = orig[i];
            if(node.classList.contains('thing')) {
                siteTable.append(posts[j++]);
            } else {
                siteTable.appendChild(node);
            }
        }
        console.log("DONE!")
    } catch(e) {
         console.log(e);
    }
};


function produce_decision_json() {
    var userSpan = document.querySelector('span.user');
    var user = userSpan ? userSpan.firstChild.text : null;

    var pathName = window.location.pathname;
    var location = null;
    if (pathName == "/")
        location = "home";
    else if(pathName.startsWith("/r/"))
        location = pathName.substring(3, pathName.length - 1);

    let decision = {
        shared: {
            context: {}
        },
        actions: []
    };

    if(user)
        decision.shared.context.user = user;
    if(pathName)
        decision.shared.context.path = location;

    var posts = getPostList();
    for (var i = 0; i < posts.length; i++) {
        var post = posts[i];
        /* TODO
            engineer the numerical features
        */
       try {
            var action = {
                __idx: i, 
                __id: post.id,
                meta: {
                    subreddit: post.attributes["data-subreddit"].value,
                    // author: post.attributes["data-author"].value,
                    // comment_count: parseInt(post.attributes["data-comments-count"].value),
                    // data_score: parseInt(post.attributes["data-score"].value),
                    // nsfw: post.attributes["data-nsfw"].value,
                    // promoted: post.attributes["data-promoted"].value,
                    // spoiler: post.attributes["data-spoiler"].value,
                    // crossPosts: parseInt(post.attributes["data-num-crossposts"].value),
                    // score: parseInt(post.attributes["data-score"].value),
                    // domain: post.attributes["data-domain"].value,
                },
                //We first have to figure out how to tokenize it properly
                // fullText: {
                //     title: post.querySelector('a.title').text
                // }
            };

            // for(var j = 0 ; j < post.classList.length; ++j) {
            //     var className = post.classList[j];
            //     if(className.startsWith("linkflair-") || className == "gilded" || className == "self") {
            //         action.meta[className] = "true";
            //     }
            // }
            decision.actions.push(action);
        } catch(e) {
            console.log(e);
        }
    }

    const msg = browser.runtime.sendMessage({
        kind: 'decision',
        context: decision
    });
    msg.then(m => {
        console.log('a decision was made: ' + JSON.stringify(m));
        promote_best_post(m.action);
        __pageEventId = m.event_id;
    });

}

function getSection() {
    const parts = window.location.pathname.split("/")
    if(parts.length == 2 && parts[0] == "" && parts[1] == "")
        return "/";
    if(parts.length == 4 && parts[0] == "" && parts[1] == "r" && parts[3] == "")
        return parts[2];
    return null;
}

const pageSection = getSection();

if(pageSection != null) {
    console.log('in a post listing page!!')
    produce_decision_json();

    function notifyExtension(e) {
        var target = e.target;
        let foundSiteTable = false;
        let actionId = null;
        let hasLink = false;
        if(!__pageEventId) {
            console.log('ignoring click because we have no event-id')
        }

        while(target && target !== undefined) {
            if(target.id == 'siteTable')
                foundSiteTable = true;
            if(target.classList && target.classList.contains('thing'))
                actionId = target.id;
            if(target.tagName == "A" || target.href)
                hasLink = true;
            target = (target == target.parentNode) ? null : target.parentNode;
        }
        console.log(`> ${actionId} -- ${foundSiteTable} ${hasLink}`);
        if(actionId && foundSiteTable) {
            browser.runtime.sendMessage({
                kind: 'click',
                actionId: actionId,
                eventId: __pageEventId,
                isLink: hasLink // maybe we can detect which link is being clicked?
            });
        }
    }
    window.addEventListener("click", notifyExtension);

}
    