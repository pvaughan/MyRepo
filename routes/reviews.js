/**
 * Created with IntelliJ IDEA.
 * User: pvaughan
 * Date: 1/29/13
 * Time: 6:19 PM
 * To change this template use File | Settings | File Templates.
 */

exports.reviews = function (req, res) {
    res.render('reviews.jade', {
        locals : {
            title :'Huwelijkscadeau'
            ,description: 'Your Page Description'
            ,author: 'Paul Vaughan'
            ,page: 'gift'
            ,analyticssiteid: 'UA-38061682-1'
        }
    });
};


exports.photoUpload = function (req, res, db) {
    db.finaliseGiftForGuest(req, res, function (result) {
        db.getGiftItemsForGuest(req, res, function (giftItems) {
            var total = 0;
            for(var i = 0; i < giftItems.length; i++) {
                total += giftItems[i].Price;
            }

            res.render('photoUpload.jade', {
                locals : {
                    title : 'Photo upload'
                    ,description: 'Your Page Description'
                    ,author: 'Paul Vaughan'
                    ,page: 'photo'
                    ,analyticssiteid: 'UA-38061682-1'
                    ,giftItems: giftItems
                    ,total: total

                }
            });
        });
    });
};


exports.showAllMedia = function (req, res, db) {
    db.getAllMedia(function (data) {
        "use strict";
        res.render('media.jade', {
            locals: {
                title: 'Photo upload',
                description: 'Your Page Description',
                author: 'Paul Vaughan',
                page: 'photo',
                media: data,
                analyticssiteid: 'UA-38061682-1'
            }
        });
    });
};