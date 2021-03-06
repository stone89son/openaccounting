﻿var socai = require("../../models/socai");
var dktk = require("../../libs/dktk");
var arrayfuncs = require("../../libs/array-funcs");
var kbmlctttt = require("../../models/kbm_lctttt");
var async = require("async");
var underscore = require("underscore");
var controller = require("../../controllers/controllerRPT");
var getRegString = function(arrayTk){
	if(!arrayTk) return null;
	var tk;
	arrayTk.forEach(function(t){
		if(t!=""){
			if(!tk){
				tk = "^" + t;
			}else{
				tk = tk + "|" + "^" + t;
			}
		}
	});
	return tk;
}
var calc = function(report,r,field,fn){
	var calculated = false;
	async.each(report,function(rlq,c6){
		var ct_field = "cong_thuc_" + field;
		if(rlq[ct_field]){
			try{
				var ma_so = "[" + r.ma_so + ']';
				if(rlq[ct_field].indexOf(ma_so)>=0){
					rlq[ct_field] = rlq[ct_field].replace(ma_so,r[field]);
					if(rlq[ct_field].indexOf("[")<0){
						rlq[field] = eval("(" + rlq[ct_field] + ")"); 
						rlq[ct_field] = null;
					}
					calculated = true;
				}
			}catch(e){
				return c6(e);
			}
		}
		c6();
	},function(error){
		if(error){
			console.log(error);
		}
		fn(error,calculated);
	});
}
module.exports = function(router){
	var rpt = new controller(router,"lctttt",function(req,callback){
		var query = req.query;
		if(!query.den_ngay || !query.tu_ngay || !query.den_ngay_kt || !query.tu_ngay_kt){
			return callback("Báo cáo này yêu cầu các tham số: tu_ngay,den_ngay,tu_ngay_kt,den_ngay_kt");
		}
		if(!query.ma_dvcs){
			query.ma_dvcs ="";
		}
		var report;
		kbmlctttt.find({id_app:query.id_app},function(error,kbm){
			if(error){
				return callback(error);
			}
			report = kbm;
			kbm.forEach(function(r){
				if(r.cong_thuc){
					r.cong_thuc_so_kn = r.cong_thuc;
					r.cong_thuc_so_kn_nt = r.cong_thuc;
					r.cong_thuc_so_kt = r.cong_thuc;
					r.cong_thuc_so_kt_nt = r.cong_thuc;
				}
			});
			async.map(report,function(r,c1){
				//tinh theo ma so
				if(r.cach_tinh=='1'){
					c1(null,r);
				}else{
					//tinh theo so phat sinh trong ky
					if(r.cach_tinh=='2'){
						async.parallel({
							//tinh ky truoc
							ky_truoc:function(callback){
								var condition = {
									ngay_ct:{$gte:query.tu_ngay_kt,$lte:query.den_ngay_kt},
									ma_dvcs:{$regex:'^' + query.ma_dvcs,$options:'i'},
									id_app:query.id_app
								};
								var tk_no = getRegString(r.tk_no);
								if(tk_no){
									if(r.giam_tru_no){
										condition.tk_no={$not:new RegExp(tk_no)};
									}else{
										condition.tk_no={$regex:tk_no,$options:'i'};
									}
								}
								var tk_co = getRegString(r.tk_co);
								if(tk_co){
									if(r.giam_tru_co && tk_co){
										condition.tk_co={$not:new RegExp(tk_co)};
									}else{
										condition.tk_co={$regex:tk_co,$options:'i'};
									}
								}
								
								socai.find(condition,{tien:1,tien_nt:1},function(error,rs){
									if(error) return callback(error);
									r.so_kt = rs.csum('tien');
									r.so_kt_nt = rs.csum('tien_nt');
									calc(report,r,'so_kt',function(er){
										calc(report,r,'so_kt_nt',function(er2){
											callback(null,r);
										});
									});
								});
								
							},
							//tinh ky nay
							ky_nay:function(callback){
								var condition = {
									ngay_ct:{$gte:query.tu_ngay,$lte:query.den_ngay},
									ma_dvcs:{$regex:'^' + query.ma_dvcs,$options:'i'},
									id_app:query.id_app
								};
								
								var tk_no = getRegString(r.tk_no);
								if(tk_no){
									if(r.giam_tru_no){
										condition.tk_no={$not:new RegExp(tk_no)};
									}else{
										condition.tk_no={$regex:tk_no,$options:'i'};
									}
								}
								var tk_co = getRegString(r.tk_co);
								if(tk_co){
									if(r.giam_tru_co && tk_co){
										condition.tk_co={$not:new RegExp(tk_co)};
									}else{
										condition.tk_co={$regex:tk_co,$options:'i'};
									}
								}
								socai.find(condition,{tien:1,tien_nt:1},function(error,rs){
									if(error) return callback(error);
									r.so_kn = rs.csum('tien');
									r.so_kn_nt = rs.csum('tien_nt');
									calc(report,r,'so_kn',function(er){
										calc(report,r,'so_kn_nt',function(er2){
											callback(null,r);
										});
									});
								});
							}
						},function(error,results){
							c1(error,results);
						});
					}else{
						//tinh theo so du dau ky
						async.parallel({
							//tinh ky truoc
							ky_truoc:function(callback){
								var condition = {
									ngay:query.tu_ngay_kt,
									ma_dvcs:query.ma_dvcs,
									id_app:query.id_app,
									bu_tru:r.bu_tru_cong_no
								};
								if(r.cach_tinh=='3' || r.cach_tinh=='4'){//tinh theo so du  hoặc du no
									var tk_no = r.tk_no;
									if(tk_no && tk_no.length==1 && tk_no[0]=="")
										tk_no = null;
									condition.tk = tk_no;
								}else{//tinh theo so du co
									var tk_co = r.tk_co;
									if(tk_co && tk_co.length==1 && tk_co[0]=="")
										tk_co = null;
									condition.tk = tk_co;
								}
								dktk(condition,function(error,rs){
									if(error) return callback(error);
									if(r.cach_tinh=='3'){//tinh theo so du
										r.so_kt = rs.csum('du_no00')-rs.csum('du_co00');
										r.so_kt_nt = rs.csum('du_no_nt00')-rs.csum('du_co_nt00');
										if(r.phan_loai=='1'){//chi
											r.so_kt =-r.so_kt;
											r.so_kt_nt =-r.so_kt_nt;
										}
										
									}else if(r.cach_tinh=='4'){//tinh theo so du no
										r.so_kt = rs.csum('du_no00');
										r.so_kt_nt = rs.csum('du_no_nt00');
									}else{//tinh theo so du co
										r.so_kt = rs.csum('du_co00');
										r.so_kt_nt = rs.csum('du_co_nt00');
									}
									calc(report,r,'so_kt',function(er){
										calc(report,r,'so_kt_nt',function(er2){
											callback(null,r);
										});
									});
								});
								
							},
							//tinh ky nay
							ky_nay:function(callback){
								var condition = {
									ngay:query.tu_ngay,
									ma_dvcs:query.ma_dvcs,
									id_app:query.id_app,
									bu_tru:r.bu_tru_cong_no
								};
								if(r.cach_tinh=='3' || r.cach_tinh=='4'){//tinh theo so du  hoặc du no
									var tk_no = r.tk_no;
									if(tk_no && tk_no.length==1 && tk_no[0]=="")
										tk_no = null;
									condition.tk = tk_no;
								}else{//tinh theo so du co
									var tk_co = r.tk_co;
									if(tk_co && tk_co.length==1 && tk_co[0]=="")
										tk_co = null;
									condition.tk = tk_co;
								}
								dktk(condition,function(error,rs){
									if(error) return callback(error);
									if(r.cach_tinh=='3'){//tinh theo so du
										r.so_kn = rs.csum('du_no00')-rs.csum('du_co00');
										r.so_kn_nt = rs.csum('du_no_nt00')-rs.csum('du_co_nt00');
										if(r.phan_loai=='1'){//chi
											r.so_kn =-r.so_kn;
											r.so_kn_nt =-r.so_kn_nt;
										}
										
									}else if(r.cach_tinh=='4'){//tinh theo so du no
										r.so_kn = rs.csum('du_no00');
										r.so_kn_nt = rs.csum('du_no_nt00');
									}else{//tinh theo so du co
										r.so_kn = rs.csum('du_co00');
										r.so_kn_nt = rs.csum('du_co_nt00');
									}
									calc(report,r,'so_kn',function(er){
										calc(report,r,'so_kn_nt',function(er2){
											callback(null,r);
										});
									});
								});
								
							}
							
						},function(error,results){
							c1(error,results);
						});
					}
				}
			},function(error,rows){
				if(error) return callback(error);
				var lq = underscore.filter(report,function(r){return r.cong_thuc_so_kn||r.cong_thuc_so_kt;});
				var calculated = true;
				//tinh cho cac cong thuc con lai
				async.whilst(
					function(){return calculated;},
					function(c){
						calculated = false;
						async.each(report,function(rv,callback){
							async.parallel({
								//tinh cho ky truoc
								kt:function(callback2){
									if(rv.so_kt || rv.so_kt==0){
										async.parallel({
											//tinh tien viet
											tv:function(cb){
												calc(lq,rv,'so_kt',function(error,caled){
													if(error){
														cb(error);
													}else{
														if(caled==true){
															calculated = true;
														}
													}
													cb();
												});
											},
											//tinh tien ngoai te
											nt:function(cb){
												calc(lq,rv,'so_kt_nt',function(error,caled){
													if(error){
														cb(error);
													}else{
														if(caled==true){
															calculated = true;
														}
													}
													cb();
												});
											}
										},function(er,rs){
											if(error) return callback2(error);
											callback2();
										});
										
									}else{
										callback2();
									}
								},
								//tinh cho ky nay
								kn:function(callback2){
									if(rv.so_kn || rv.so_kn==0){
										async.parallel({
											//tinh tien viet
											tv:function(cb){
												calc(lq,rv,'so_kn',function(error,caled){
													if(error){
														cb(error);
													}else{
														if(caled==true){
															calculated = true;
														}
													}
													cb();
												});
											},
											//tinh tien ngoai te
											nt:function(cb){
												calc(lq,rv,'so_kn_nt',function(error,caled){
													if(error){
														cb(error);
													}else{
														if(caled==true){
															calculated = true;
														}
													}
													cb();
												});
											}
										},function(er,rs){
											if(error) return callback2(error);
											callback2();
										});
										
									}else{
										callback2();
									}
								}
							},function(error,results){
								callback();
							});
							
						},function(error){
							c(error);
						});
					},
					function(error){
						callback(null,report);
					}
				);
				
				
			});
		});
		
		
	});
}