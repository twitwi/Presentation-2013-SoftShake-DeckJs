





$(function() {
    window.randomMoveAround = function(what) {
        function makeNewPosition(){
            // Get viewport dimensions (remove the dimension of the div)
            var h = 500;
            var w = 650;
            var nh = 45+Math.floor(Math.random() * h);
            var nw = Math.floor(Math.random() * w);
            return [nh,nw];    
        }

        function calcSpeed(prev, next) {
            var x = Math.abs(prev[1] - next[1]);
            var y = Math.abs(prev[0] - next[0]);
            var greatest = x > y ? x : y;
            var speedModifier = 0.1;
            var speed = Math.ceil(greatest/speedModifier);
            return speed;
        }

        function animateDiv(){
            var newq = makeNewPosition();
            var oldq = $(what).offset();
            var speed = calcSpeed([oldq.top, oldq.left], newq);
            
            $(what).animate({ top: newq[0], left: newq[1] }, speed, function(){
                animateDiv();        
            });
        }
        animateDiv();
    }
});
