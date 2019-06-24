/**
 * React Component .

 */
var React = require('react');
var SegmentConstants = require('../../constants/SegmentConstants');
var SegmentStore = require('../../stores/SegmentStore');
var SegmentActions = require('../../actions/SegmentActions');

class SegmentFooterTabGlossary extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            matches: [],
            openComment: false,
            enableAddButton: false
        };
        this.checkGlossary = this.checkGlossary.bind(this);
        this.copyItemInEditArea = this.copyItemInEditArea.bind(this);
        this.matches = [];
    }

    checkGlossary() {
        SegmentActions.addClassToSegment(this.props.id_segment, 'glossary-loaded');
    }



    searchInGlossary(e) {
        if (e.key === 'Enter') {
            let self = this;
            e.preventDefault();
            let txt = this.source.textContent;
            let target = this.target.textContent;
            if (txt.length > 2 && !target) {

                SegmentActions.searchGlossary(this.props.segment.sid,this.props.segment.fid,txt)

            } else if (txt && target) {
                this.setGlossaryItem();
            }
        }
    }

    deleteMatch(name, idMatch, event) {
        event.preventDefault();
        let self = this;
        let source = UI.decodePlaceholdersToText(this.props.segment.glossary[name][0].segment);
        let target = UI.decodePlaceholdersToText(this.props.segment.glossary[name][0].translation);
        SegmentActions.deleteGlossaryItem(source, target)
            .done(function (data) {
                UI.footerMessage('A glossary item has been deleted', UI.getSegmentById(self.props.id_segment));
            });
        let matches = $.extend(true, {}, this.props.segment.glossary);
        matches = _.remove(matches, function (n) {
            return n === name
        });
        this.setState({
            matches: matches
        });
    }

    updateGlossaryItem(source, e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            let self = this;
            let target = $(this.matches[source]).find('.sugg-target span').text();
            let comment = ($(this.matches[source]).find('.details .comment').length > 0) ? $(this.matches[source]).find('.details .comment').text() :
                $(this.matches[source]).find('.glossary-add-comment .gl-comment').text();
            let matches = $.extend(true, {}, this.props.segment.glossary);
            SegmentActions.updateGlossaryItem(matches[source][0].id, matches[source][0].segment, matches[source][0].translation, target, comment)
                .done(function (response) {
                    UI.footerMessage('A glossary item has been updated', UI.getSegmentById(self.props.id_segment));
                });
            $(this.matches[source]).find('.sugg-target span, .details .comment').removeClass('editing');
            $(this.matches[source]).find('.sugg-target span, .details .comment').removeAttr('contenteditable');
            matches[source][0].comment = comment;
            matches[source][0].target_note = comment;
            matches[source][0].translation = target;
            this.setState({
                matches: matches
            });
        }
    }

    openAddComment(e) {
        e.preventDefault();
        this.setState({
            openComment: !this.state.openComment
        });
    }

    openAddCommentExistingMatch(match, e) {
        e.preventDefault();
        $(this.matches[match]).find('.glossary-add-comment .gl-comment').toggle();
    }

    editExistingMatch(match, e) {
        e.preventDefault();
        $(this.matches[match]).find('.sugg-target span, .details .comment').toggleClass('editing');
        if ( $(this.matches[match]).find('.sugg-target span').attr('contenteditable') ) {
            $(this.matches[match]).find('.sugg-target span, .details .comment').removeAttr('contenteditable');
        } else {
            $(this.matches[match]).find('.sugg-target span, .details .comment').attr('contenteditable', true);
        }
    }

    onKeyUpSetItem() {
        let source = this.source.textContent;
        let target = this.target.textContent;
        this.setState({
            enableAddButton: this.checkAddItemButton(source, target)
        });
    }

    onEnterSetItem(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.setGlossaryItem();
        }
    }

    onClickSetItem() {
        this.setGlossaryItem()
    }

    setGlossaryItem() {
        let source = this.source.textContent;
        let target = this.target.textContent;
        if (this.checkAddItemButton(source, target)) {
            let self = this;
            let comment = (this.comment) ? this.comment.textContent : null;
            this.setState({
                loading: true
            });
            SegmentActions.addGlossaryItem(source, target, comment)
                .done(function (response) {
                    if (response.data.created_tm_key) {
                        UI.footerMessage('A Private TM Key has been created for this job', UI.getSegmentById(self.props.id_segment));
                        UI.noGlossary = false;
                    } else {
                        let msg = (response.errors.length) ? response.errors[0].message : 'A glossary item has been added';
                        UI.footerMessage(msg, UI.getSegmentById(self.props.id_segment));
                    }
                    self.source.textContent = '';
                    self.target.textContent = '';

                    let matches = $.extend({}, response.data.matches, self.props.segment.glossary);

                    self.setState({
                        loading: false,
                        openComment: false,
                        enableAddButton: false,
                        matches: matches
                    });

                });

        } else {
            APP.alert({msg: 'Please insert a glossary term.'});
            this.setState({
                enableAddButton: false
            });
        }
    }

    checkAddItemButton(source, target) {
        return source && target;
    }

    copyItemInEditArea(translation) {
        SegmentActions.replaceEditAreaTextContent(this.props.segment.sid,this.props.segment.fid,translation)
    }
    onPasteEvent(e) {
        // cancel paste
        e.preventDefault();
        // get text representation of clipboard
        var text = (e.originalEvent || e).clipboardData.getData('text/plain');
        // insert text manually
        document.execCommand("insertHTML", false, text);
    }
    renderMatches() {
        let htmlResults = [];
        if (Object.size(this.props.segment.glossary)) {

            let self = this;
            $.each(this.props.segment.glossary, function (name, value) {
                let match = value[0];
                if ((match.segment === '') || (match.translation === ''))
                    return;
                let cb = match.created_by;
                let disabled = (match.id == '0') ? true : false;
                let sourceNoteEmpty = (_.isUndefined(match.source_note) || match.source_note === '');
                let targetNoteEmpty = (_.isUndefined(match.target_note) || match.target_note === '');

                if (sourceNoteEmpty && targetNoteEmpty) {
                    match.comment = '';
                }
                else if (!targetNoteEmpty) {
                    match.comment = match.target_note;
                }
                else if (!sourceNoteEmpty) {
                    match.comment = match.source_note;
                }

                let leftTxt = match.segment;
                let rightTxt = match.translation;
                let commentOriginal = match.comment;
                if (commentOriginal) {
                    commentOriginal = commentOriginal.replace(/\#\{/gi, "<mark>");
                    commentOriginal = commentOriginal.replace(/\}\#/gi, "</mark>");
                }

                let addCommentHtml = <div className="glossary-add-comment">
                    <a href="#" onClick={self.openAddCommentExistingMatch.bind(self, name)}>Add a Comment</a>
                    <div className="input gl-comment" contentEditable="true" style={{display: 'none'}}
                         onKeyPress={self.updateGlossaryItem.bind(self, name)}/>
                </div>;

                let html = <div key={name} ref={(match)=>self.matches[name] = match}>
                    <div className="glossary-item"><span>{name}</span></div>
                    <ul className="graysmall" data-id={match.id}>
                        <li className="sugg-source">
                            <div id={self.props.id_segment + '-tm-' + match.id + '-edit'}
                                 className="switch-editing icon-edit" title="Edit"
                                 onClick={self.editExistingMatch.bind(self, name)}/>
                            {disabled ? '' :
                                <span id={self.props.id_segment + '-tm-' + match.id + '-delete'} className="trash"
                                      title="delete this row"
                                      onClick={self.deleteMatch.bind(self, name, match.id)}/>}
                            <span id={self.props.id_segment + '-tm-' + match.id + '-source'}
                                  className="suggestion_source"
                                  dangerouslySetInnerHTML={self.allowHTML(UI.decodePlaceholdersToText(leftTxt, true))}/>
                        </li>
                        <li className="b sugg-target" onDoubleClick={self.copyItemInEditArea.bind(this, rightTxt)}>
                            <span id={self.props.id_segment + '-tm-' + match.id + '-translation'}
                                  className="translation"
                                  data-original={UI.decodePlaceholdersToText(rightTxt, true)}
                                  dangerouslySetInnerHTML={self.allowHTML(UI.decodePlaceholdersToText(rightTxt, true))}
                                  onKeyPress={self.updateGlossaryItem.bind(self, name)}/>
                        </li>
                        <li className="details">
                            {(!match.comment || match.comment === '') ? addCommentHtml :
                                <div className="comment"
                                     data-original={UI.decodePlaceholdersToText(commentOriginal, true)}
                                     dangerouslySetInnerHTML={self.allowHTML(UI.decodePlaceholdersToText(commentOriginal, true))}
                                     onKeyPress={self.updateGlossaryItem.bind(self, name)}/>
                            }
                            <ul className="graysmall-details">
                                <li>{match.last_update_date}</li>
                                <li className="graydesc">Source:
                                    <span className="bold"> {cb}</span>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>;
                htmlResults.push(html);
            });
        }
        return htmlResults;
    }

    componentDidMount() {
        this._isMounted = true;
        console.log("Mount SegmentFooterGlossary" + this.props.id_segment);
        //SegmentStore.addListener(SegmentConstants.RENDER_GLOSSARY, this.checkGlossary);

    }

    componentWillUnmount() {
        this._isMounted = false;
        console.log("Unmount SegmentFooterGlossary" + this.props.id_segment);
        //SegmentStore.removeListener(SegmentConstants.RENDER_GLOSSARY, this.checkGlossary);

    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.openComment !== this.state.openComment && this.state.openComment) {
            this.comment.focus();
        }
    }
    componentWillReceiveProps(next){

    }
    allowHTML(string) {
        return {__html: string};
    }

    render() {
        let matches
        if(this.props.segment && this.props.segment.glossary){
            this.checkGlossary();
            matches= this.renderMatches();
        }

        let html = '';
        let loading = classnames({
            'gl-search': true,
            'loading': this.state.loading,
        });
        if (config.tms_enabled) {
            html = <div className={loading}>
                <div ref={(source)=>this.source=source} className="input search-source" contentEditable="true" onKeyPress={this.searchInGlossary.bind(this)} onPaste={this.onPasteEvent.bind(this)}/>
                <div ref={(target)=>this.target=target} className="input search-target" contentEditable="true" onKeyDown={this.onEnterSetItem.bind(this)} onPaste={this.onPasteEvent.bind(this)}
                    onKeyUp={this.onKeyUpSetItem.bind(this)}/>
                {this.state.enableAddButton ? (
                    <span className="set-glossary" onClick={this.onClickSetItem.bind(this)}/>
                ) : (
                    <span className="set-glossary disabled"/>
                )}
                <div className="comment">
                    <a href="#" onClick={this.openAddComment.bind(this)}>(+) Comment</a>
                    {this.state.openComment ? (
                        <div ref={(comment) => this.comment = comment} className="input gl-comment"
                             contentEditable="true"
                             onKeyDown={this.onEnterSetItem.bind(this)}/>
                    ) : (null)}

                </div>
                <div className="results">
                    {matches}
                </div>
            </div>;
        } else {
            html = <ul className="graysmall message">
                <li>Glossary is not available when the TM feature is disabled</li>
            </ul>;
        }
        return (

            <div key={"container_" + this.props.code} className={"tab sub-editor "+ this.props.active_class + " " + this.props.tab_class}
                 id={"segment-" + this.props.id_segment + "-" + this.props.tab_class}>
                <div className="overflow">
                    {html}
                </div>
            </div>
        )
    }
}

export default SegmentFooterTabGlossary;