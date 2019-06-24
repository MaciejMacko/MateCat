/**
 * React Component .

 */
let React = require('react');
let SegmentConstants = require('../../constants/SegmentConstants');
let SegmentActions = require('../../actions/SegmentActions');
let SegmentStore = require('../../stores/SegmentStore');

class SegmentFooterTabMatches extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            matches: undefined
        };
        this.suggestionShortcutLabel = 'CTRL+';
        this.processContributions = this.processContributions.bind(this);
        this.chooseSuggestion = this.chooseSuggestion.bind(this);
        SegmentActions.getContributions(this.props.segment.sid, this.props.fid, this.props.segment.segment);
    }


    processContributions(matches) {
        let self = this;
        let matchesProcessed = [];
        _.each(matches, function (el, index) {
            if ( _.isUndefined(el.segment) || (el.segment === '') || (el.translation === '')) return false;
            let item = {};
            item.id = el.id;
            item.disabled = (el.id == '0') ? true : false;
            item.cb = el.created_by;
            item.segment = el.segment;
            if ("sentence_confidence" in el &&
                (
                    el.sentence_confidence !== "" &&
                    el.sentence_confidence !== 0 &&
                    el.sentence_confidence != "0" &&
                    el.sentence_confidence !== null &&
                    el.sentence_confidence !== false &&
                    typeof el.sentence_confidence != 'undefined'
                )
            ) {
                item.suggestion_info = "Quality: <b>" + el.sentence_confidence + "</b>";
            } else if (el.match != 'MT') {
                item.suggestion_info = el.last_update_date;
            } else {
                item.suggestion_info = '';
            }

            item.percentClass = UI.getPercentuageClass(el.match);
            item.percentText = el.match;

            // Attention Bug: We are mixing the view mode and the raw data mode.
            // before doing a enanched  view you will need to add a data-original tag
            //
            item.suggestionDecodedHtml = UI.transformTextForLockTags(UI.decodePlaceholdersToText(el.segment));
            item.translationDecodedHtml = UI.transformTextForLockTags(UI.decodePlaceholdersToText(el.translation));
            item.sourceDiff = item.suggestionDecodedHtml;
            if (el.match !== "MT" && parseInt(el.match) > 74) {
                let sourceDecoded = UI.removePhTagsWithEquivTextIntoText(self.props.segment.segment);
                let matchDecoded = UI.removePhTagsWithEquivTextIntoText(el.segment);
                let diff_obj = UI.execDiff(matchDecoded, sourceDecoded);
                item.sourceDiff = UI.dmp.diff_prettyHtml(diff_obj);
                item.sourceDiff = item.sourceDiff.replace(/&amp;/g, "&");
            }
            if (!_.isUndefined(el.tm_properties)) {
                item.tm_properties = el.tm_properties;
            }
            let matchToInsert = self.processMatchCallback(item);
            if ( matchToInsert ) {
                matchesProcessed.push(item);
            }
        });
        return matchesProcessed;
    }

    /**
     * Used by the plugins to override matches
     * @param item
     * @returns {*}
     */
    processMatchCallback( item) {
        return item;
    }

    chooseSuggestion(sid, index) {
        if (this.props.id_segment === sid) {
            this.suggestionDblClick(this.props.segment.contributions, index);
        }
    }

    suggestionDblClick(match, index) {
        let self = this;
        let ulDataItem = '.editor .tab.matches ul[data-item=';
        UI.setChosenSuggestion(index);
        UI.editarea.focus();
        UI.disableTPOnSegment();
        setTimeout(function () {
            UI.copySuggestionInEditarea(UI.currentSegment, $(ulDataItem + index + '] li.b .translation').html(),
                $('.editor .editarea'), $(ulDataItem + index + '] ul.graysmall-details .percent').text(), false, false, index, $(ulDataItem + index + '] li.graydesc .bold').text());
            //SegmentActions.highlightEditarea(self.props.id_segment);
        }, 0);
        SegmentActions.setChosenContributionIndex(this.props.segment.sid, this.props.segment.fid, index);
    }

    deleteSuggestion(match, index) {
        let source, target;
        let matches = this.props.segment.contributions;
        source = htmlDecode(match.segment);
        let ul = $('.suggestion-item[data-id="' + match.id + '"]');
        if (config.brPlaceholdEnabled) {
            target = UI.postProcessEditarea(ul, '.translation');
        } else {
            target = $('.translation', ul).text();
        }
        target = view2rawxliff(target);
        source = view2rawxliff(source);
        matches.splice(index, 1);
        UI.setDeleteSuggestion(source, target, match.id);
        this.setState({
            matches: matches
        });
    }

    getMatchInfo(match) {
        return <ul className="graysmall-details">
            <li className={'percent ' + match.percentClass}>
                {match.percentText}
            </li>
            <li>
                {match.suggestion_info}
            </li>
            <li className="graydesc">
                Source:
                <span className="bold" style={{fontSize: '14px'}}> {match.cb}</span>
            </li>
        </ul>;
    }

    checkChosenSuggestionIndex() {
        if ( ((Speech2Text.enabled() && Speech2Text.isContributionToBeAllowed(match)) || !Speech2Text.enabled() ) //Todo: check Speech2Text
            && this.props.segment.status === 'NEW'
            && !this.props.segment.chosenContributionIndex
            && this.props.segment.contributions
            && this.props.segment.contributions.matches
            && this.props.segment.contributions.matches.length > 0) {
            setTimeout(() => {
                this.chooseSuggestion(this.props.segment.sid, 1);
            }, 0);
        }
    }

    componentDidMount() {
        this._isMounted = true;
        SegmentStore.addListener(SegmentConstants.CHOOSE_CONTRIBUTION, this.chooseSuggestion);
        this.checkChosenSuggestionIndex();
    }

    componentWillUnmount() {
        this._isMounted = false;
        SegmentStore.removeListener(SegmentConstants.CHOOSE_CONTRIBUTION, this.chooseSuggestion);
    }

    /**
     * Do not delete, extended by plugin
     */
    componentDidUpdate() {
        this.checkChosenSuggestionIndex();
    }

    allowHTML(string) {
        return {__html: string};
    }

    render() {
        let matches = [];
        if (this.props.segment.contributions && this.props.segment.contributions.matches && this.props.segment.contributions.matches.length > 0) {
            let tpmMatches = this.processContributions(this.props.segment.contributions.matches);
            let self = this;
            tpmMatches.forEach(function (match, index) {
                let trashIcon = (match.disabled) ? '' : <span id={self.props.id_segment + '-tm-' + match.id + '-delete'}
                                                              className="trash"
                                                              title="delete this row"
                                                              onClick={self.deleteSuggestion.bind(self, match, index)}/>;
                let item =
                    <ul key={match.id}
                        className="suggestion-item graysmall"
                        data-item={(index + 1)}
                        data-id={match.id}
                        data-original={match.segment}
                        onDoubleClick={self.suggestionDblClick.bind(self, match, index + 1)}>
                        <li className="sugg-source">
                            <span
                                id={self.props.id_segment + '-tm-' + match.id + '-source'}
                                className="suggestion_source"
                                dangerouslySetInnerHTML={self.allowHTML(match.sourceDiff)}>
                            </span>
                        </li>
                        <li className="b sugg-target">
                            <span className="graysmall-message"> {self.suggestionShortcutLabel + (index + 1)}
                            </span>
                            <span
                                id={self.props.id_segment + '-tm-' + match.id + '-translation'}
                                className="translation"
                                dangerouslySetInnerHTML={self.allowHTML(match.translationDecodedHtml)}>
                            </span>
                            {trashIcon}
                        </li>
                        {self.getMatchInfo( match )}
                    </ul>;
                matches.push( item );
            } );

        } else if (this.props.segment.contributions && this.props.segment.contributions.matches && this.props.segment.contributions.matches.length === 0 ){
            if((config.mt_enabled)&&(!config.id_translator)) {
                matches.push( <ul key={0} className="graysmall message">
                    <li>No matches could be found for this segment. Please, contact <a href="mailto:support@matecat.com">support@matecat.com</a> if you think this is an error.</li>
                </ul>);
            } else {
                matches.push( <ul key={0} className="graysmall message">
                    <li>No match found for this segment</li>
                </ul>);
            }
        }

        let errors = [];
        if (this.props.segment.contributions && this.props.segment.contributions.errors.length > 0) {
            this.props.segment.contributions.errors.forEach((error, index) => {
                let toAdd = false,
                    percentClass = '',
                    messageClass,
                    imgClass,
                    messageTypeText;

                switch (error.code) {
                    case '-2001':
                        toAdd = true;
                        percentClass = "per-red";
                        messageClass = 'error';
                        imgClass = 'error-img';
                        messageTypeText = 'Error: ';
                        break;
                    case '-2002':
                        toAdd = true;
                        messageClass = 'warning';
                        imgClass = 'warning-img';
                        messageTypeText = 'Warning: ';
                        break;
                }
                if (toAdd) {

                    let item = <ul className="engine-error-item graysmall">
                        <li className="engine-error">
                            <div className={imgClass}></div>
                            <span
                                className={"engine-error-message " + messageClass}>{messageTypeText + ' ' + error.message}</span>
                        </li>
                    </ul>;

                    errors.push(item);

                }
            });

        }


        return (
        <div
            key={"container_" + this.props.code}
            className={"tab sub-editor "+ this.props.active_class + " " + this.props.tab_class}
            id={"segment-" + this.props.id_segment + "-" + this.props.tab_class}>
            <div className="overflow">
                { !_.isUndefined(matches) && matches.length > 0 ? (
                    matches
                ): (
                    <span className="loader loader_on"/>
                )}

            </div>
            <div className="engine-errors">{errors}</div>
        </div>
        )
    }
}

export default SegmentFooterTabMatches;
